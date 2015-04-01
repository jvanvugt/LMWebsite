var monopolyProviders = angular.module('monopolyProviders', []);

monopolyProviders.factory('WithFilterableId', function($FirebaseArray, $firebaseUtils) {
   return $FirebaseArray.$extendFactory({
       $$added:  function(snap) {
           var rec = $FirebaseArray.prototype.$$added.call(this, snap);
           rec._id = rec.$id;
           return rec;
       }
   });
});

monopolyProviders.constant('FIREBASE_URL','https://cognac-monopoly.firebaseio.com/');

monopolyProviders.service('DataRoot', function($firebase, FIREBASE_URL) {
  return new Firebase(FIREBASE_URL);
});

monopolyProviders.service('Data', function (DataRoot, Chance, $firebase) {
  this.teams = $firebase(DataRoot.child('teams')).$asObject();
  this.users = $firebase(DataRoot.child('users')).$asObject();
  this.cities = $firebase(DataRoot.child('cities')).$asObject();
  this.streets = $firebase(DataRoot.child('streets')).$asObject();
  this.tasks = $firebase(DataRoot.child('tasks')).$asObject();
  this.cards = $firebase(DataRoot.child('cards')).$asObject();
  this.events = $firebase(DataRoot.child('events')).$asObject();
  this.constants = $firebase(DataRoot.child('static').child('constants')).$asObject();
  this.societies = $firebase(DataRoot.child('static').child('societies')).$asObject();

  var chance = Chance(this);

  this.teamVisitStreet = function(teamId, streetId, timestamp) {
    DataRoot.child('streets').child(streetId).child('visitors').child(teamId).child('timestamp').set(timestamp);
    this.addEvent(teamId, 'visit_street', {street: streetId}, timestamp);
    //TODO: message if have to pay?

    if (chance.cardOnVisitStreet()) //TODO: REMOVE TRUE
      this.teamGetCard(teamId, timestamp); //TODO: message if get card
  };

  this.teamGetCard = function(teamId, timestamp) {
    var card = chance.objectProperty(this.teamAvailableCards(teamId));
    DataRoot.child('cards').child(card.id).child('received').child(teamId).child('timestamp').set(timestamp);
    this.addEvent(teamId, 'receive_card', {card: card.id}, timestamp);
  };

  this.teamAvailableCards = function(teamId) {
    var availableCards = {};
    this.cards.forEach(function(card, id) {
      if(!card.visitors || !card.visitors[teamId])
        availableCards[id] = card;
    });
    return availableCards;
  };

  this.teamCompleteCard = function(teamId, cardId, timestamp) {
    DataRoot.child('cards').child(cardId).child('received').child(teamId).child('completed').set(timestamp);
  };

  this.teamUncompleteCard = function(teamId, cardId, timestamp) {
    DataRoot.child('cards').child(cardId).child('received').child(teamId).child('completed').remove();
  };

  this.teamBuyHotel = function(teamId, streetId, timestamp) {
    var streetref = DataRoot.child('streets').child(streetId)
    streetref.child('hotel_team_id').set(teamId);
    streetref.child('hotel_timestamp').set(timestamp);
    this.addEvent(teamId, 'buy_hotel', {street: streetId}, timestamp);
  };

  this.teamCompleteTask = function(teamId, taskId, taskValue, timestamp) {
    var taskcompletedteamref = DataRoot.child('tasks').child(taskId).child('completed').child(teamId);
    if (this.tasks[taskId].completed && this.tasks[taskId].completed[teamId]) {
      taskcompletedteamref.child('repeats').event(function(current) {
        return current+1;
      });
    } else {
      if (taskValue)
        taskcompletedteamref.child('rank_value').set(taskValue);
      taskcompletedteamref.child('repeats').set(1);
    }
    this.addEvent(teamId, 'complete_task', {task: taskId}, timestamp);
  };

  this.teamUncompleteTask = function(teamId, taskId, timestamp) {
    var taskcompletedteamref = DataRoot.child('tasks').child(taskId).child('completed').child(teamId);
    taskcompletedteamref.child('repeats').event(function(current) {
      return current-1;
    });
    this.addEvent(teamId, 'complete_task', {task: taskId}, timestampe, true);
  };

  this.teamStraightMoney = function(teamId, amount, note, timestamp) {
    this.addEvent(teamId, 'straight_money', {amount: amount, note: note}, timestamp);
  };

  this.addEvent = function(teamId, type, data, timestamp, undo) {
    if (typeof(undo) === 'undefined') undo = false;
    evnt = {};
    evnt['timestamp'] = timestamp;
    evnt['type'] = type;
    evnt['team'] = teamId;
    evnt['undo'] = undo;
    evnt['data'] = data;
    evnt['active'] = true;
    DataRoot.child('events').push(evnt);
  };

  this.toggleEvent = function(eventId) {
    var eventref = DataRoot.child('events').child(eventId);
    eventref.child('active').transaction(function(current) {
      return !current;
    });
  };

  this.timestampOf = function(data) {
    if (data.timestamp)
      return data.timestamp.getTime();
    else
      return Firebase.ServerValue.TIMESTAMP;
  };

  this.now = function() {
    return new Date().getTime();
  };
});

monopolyProviders.factory('Chance', function () {
  return function(data) {

    this.cardOnVisitStreet = function() {
      return Math.random() * 100 <= data.constants.probability_card_per_street;
    };

    this.objectProperty = function(obj) {
      var keys = Object.keys(obj)
      var rand = keys[keys.length * Math.random() << 0];
      return {id: rand, card: obj[rand]};
    };

    return this;
  };
});

monopolyProviders.factory("TransactionsFactory", function($FirebaseArray, $firebase, Data, DataRoot) {
  var TransactionsFactory = $FirebaseArray.$extendFactory({
    getBalance: function() {
      var balance = 0;
      angular.forEach(this.$list, function(event) {
        if (!event.active) return;
        var undo = event.undo ? -1 : 1;
        switch (event.type) {
          case 'visit_street':
            if (!(Data.streets[event.street] && Data.streets[event.street].visitors && Data.streets[event.street].visitors[event.team])) break;
            balance += Data.constants.visit_street_profits * undo;
            if (Data.streets[event.street] &&
                Data.streets[event.street].hotel_timestamp &&
                Data.streets[event.street].hotel_timestamp <= event.timestamp) {
              balance -= Data.constants.visit_hotel_costs * undo;
            }
            break;
          case 'buy_hotel':
            balance -= Data.constants.buy_hotel_costs * undo;
            if (Data.streets[event.street] &&
                Data.streets[event.street].visitors) {
              angular.forEach(Data.streets[event.street].visitors, function (visit, visitor) {
                if (visit.timestamp &&
                    visit.timestamp >= event.timestamp)
                  balance += Data.constants.visit_hotel_profits * undo;
              });
            }
            break;
          case 'complete_task':
            if (!(Data.tasks[event.task] && Data.tasks[event.task].completed[event.team].repeats > 0)) break;
            if (Data.tasks[event.task].rankable) {
              // TODO: Ranking
            }  else
              balance += Data.tasks[event.task].reward * undo;
            break;
          case 'receive_card':
            var card = Data.cards[event.card];
            if (!(card && card.received && card.received[event.team])) break;
            if (card.received && card.received[event.team] && card.received[event.team].completed) {
              if (card.is_positive)
                balance += card.amount * undo;
            } else {
              if (!card.is_positive && Data.now() > card.received[event.team].timestamp + Data.constants.card_max_time*60*1000)
                balance -= card.amount * undo;
            }
            break;
          case 'straight_money':
            balance += event.amount * undo;
          default:
            break;
        }
      });
      return balance;
    }
  });

  return function(teamId) {
    var sync = $firebase(DataRoot.child('events').orderByChild('team').equalTo(teamId), {arrayFactory: TransactionsFactory});
    return sync.$asArray();
  }
});

monopolyProviders.filter('objectLimitTo', [function(){
    return function(obj, limit){
        if (!obj) return [];
        var keys = Object.keys(obj);
        if(keys.length < 1) return [];

        var ret = new Object,
        count = 0;
        angular.forEach(keys, function(key, arrayIndex){
           if(count >= limit){
                return false;
            }
            ret[key] = obj[key];
            count++;
        });
        return ret;
    };
}]);

monopolyProviders.filter('objectOrderBy', function() {
  return function(items, field, reverse) {
    var filtered = [];
    angular.forEach(items, function(item) {
      filtered.push(item);
    });
    filtered.sort(function (a, b) {
      return (a[field] > b[field] ? 1 : -1);
    });
    if(reverse) filtered.reverse();
    return filtered;
  };
});

monopolyProviders.filter('toArray', function () {
  return function (obj) {
    if (!(obj instanceof Object)) return obj;

    return Object.keys(obj).map(function (key) {
      return Object.defineProperty(obj[key], '$key', {__proto__: null, value: key});
    });
  }
});
