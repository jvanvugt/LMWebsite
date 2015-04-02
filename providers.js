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

monopolyProviders.service('Data', function (DataRoot, Chance, $firebase, EventsFactory, $interval) {
  this.teams = $firebase(DataRoot.child('teams')).$asObject();
  this.users = $firebase(DataRoot.child('users')).$asObject();
  this.cities = $firebase(DataRoot.child('cities')).$asObject();
  this.streets = $firebase(DataRoot.child('streets')).$asObject();
  this.tasks = $firebase(DataRoot.child('tasks')).$asObject();
  this.cards = $firebase(DataRoot.child('cards')).$asObject();
  this.events = EventsFactory(this);
  this.eventsobj = $firebase(DataRoot.child('events')).$asObject();
  this.constants = $firebase(DataRoot.child('static').child('constants')).$asObject();
  this.societies = $firebase(DataRoot.child('static').child('societies')).$asObject();

  var chance = Chance(this);

  this.teamVisitStreet = function(teamId, streetId, timestamp) {
    DataRoot.child('streets').child(streetId).child('visited').child(teamId).set(timestamp);
    this.addEvent(teamId, 'visit_street', {street: streetId}, timestamp);
    //TODO: message if have to pay?

    if (chance.cardOnVisitStreet()) //TODO: REMOVE TRUE
      this.teamGetCard(teamId, timestamp); //TODO: message if get card
  };

  this.teamGetCard = function(teamId, timestamp) {
    var card = chance.objectProperty(this.teamAvailableCards(teamId));
    DataRoot.child('cards').child(card.id).child('received').child(teamId).set(timestamp);
    this.addEvent(teamId, 'receive_card', {card: card.id}, timestamp);
  };

  this.teamAvailableCards = function(teamId) {
    var availableCards = {};
    this.cards.forEach(function(card, id) {
      if(!card.visited || !card.visited[teamId])
        availableCards[id] = card;
    });
    return availableCards;
  };

  this.teamCompleteCard = function(teamId, cardId, timestamp) {
    DataRoot.child('cards').child(cardId).child('completed').child(teamId).set(timestamp);
    this.addEvent(teamId, 'complete_card', {card: cardId}, timestamp);
  };

  this.teamUncompleteCard = function(teamId, cardId, timestamp) {
    DataRoot.child('cards').child(cardId).child('completed').child(teamId).remove();
    this.addEvent(teamId, 'complete_card', {card: cardId}, timestamp, true);
  };

  this.teamBuyHotel = function(teamId, streetId, timestamp) {
    var streetref = DataRoot.child('streets').child(streetId)
    streetref.child('hotel_team_id').set(teamId);
    streetref.child('hotel_timestamp').set(timestamp);
    this.addEvent(teamId, 'buy_hotel', {street: streetId}, timestamp);
  };

  this.teamCompleteTask = function(teamId, taskId, taskValue, timestamp) {
    var taskref = DataRoot.child('tasks').child(taskId);
    var taskrepeatedteamref = taskref.child('repeated').child(teamId);
    var taskrankedteamref = taskref.child('ranked').child(teamId);
    if (this.tasks[taskId].repeated && this.tasks[taskId].repeated[teamId]) {
      taskrepeatedteamref.transaction(function(current) {
        return current+1;
      });
    } else {
      if (taskValue)
        taskrankedteamref.set(taskValue);
      taskrepeatedteamref.set(1);
    }
    this.addEvent(teamId, 'complete_task', {task: taskId}, timestamp);
  };

  this.teamUncompleteTask = function(teamId, taskId, timestamp) {
    var taskref = DataRoot.child('tasks').child(taskId);
    var taskrepeatedteamref = taskref.child('repeated').child(teamId);
    var taskrankedteamref = taskref.child('ranked').child(teamId);
    taskrepeatedteamref.transaction(function(current) {
      return current-1;
    });
    this.addEvent(teamId, 'complete_task', {task: taskId}, timestamp, true);
  };

  this.taskRank = function(teamId, taskId) {
    var task = this.tasks[taskId];
    var teamRankValue = task.ranked[teamId];
    var rank = 0;
    angular.forEach(task.ranked, function (rankValue, id) {
      if (task.repeated[id] > 0 && rankValue > teamRankValue)
        rank += 1;
    });
    return rank;
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

  this.setNow = function() {
    this.now = new Date().getTime();
  };

  this.setNow();

  $interval(function(){
      this.setNow();
   }.bind(this), 1000);
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

monopolyProviders.service("EventsFactory", function($FirebaseArray, $firebase, DataRoot) {

  var eventValue = function(event) {
    var value = 0;
    switch (event.type) {
      case 'visit_street':
        if (!(data.streets[event.data.street] && data.streets[event.data.street].visited && data.streets[event.data.street].visited[event.team])) break;
        value += data.constants.visit_street_profits;
        if (data.streets[event.data.street] &&
            data.streets[event.data.street].hotel_timestamp &&
            data.streets[event.data.street].hotel_timestamp <= event.timestamp) {
          value -= data.constants.visit_hotel_costs;
        }
        break;
      case 'buy_hotel':
        value -= data.constants.buy_hotel_costs;
        if (data.streets[event.data.street] &&
            data.streets[event.data.street].visited) {
          angular.forEach(data.streets[event.data.street].visited, function (visit) {
            if (visit >= event.timestamp)
              value += data.constants.visit_hotel_profits;
          });
        }
        break;
      case 'complete_task':
        if (!(data.tasks[event.data.task] &&
              data.tasks[event.data.task].repeated &&
              data.tasks[event.data.task].repeated[event.team] > 0)) break;
        if (data.tasks[event.data.task].rankable) {
          var rank = data.taskRank(event.team, event.data.task);
          if (rank < data.tasks[event.data.task].rewards.length)
            value += data.tasks[event.data.task].rewards[rank]
          console.log(rank);
        }  else
          value += data.tasks[event.data.task].rewards[0];
        break;
      case 'receive_card':
        var card = data.cards[event.data.card];
        if (!(card && card.received && card.received[event.team])) break;
        if (card.completed && card.completed[event.team]) {
          if (card.is_positive)
            value += card.amount;
        } else {
          if (!card.is_positive && data.now > card.received[event.team] + data.constants.card_max_time*60*1000)
            value -= card.amount;
        }
        break;
      case 'straight_money':
        value += event.data.amount;
      default:
        break;
    }
    return value;
  };

  var EventsFactory = $FirebaseArray.$extendFactory({
    balance: function(teamId) {
      var balance = 0;
      angular.forEach(this.$list, function(event) {
        if (event.active && event.team == teamId)
          balance += eventValue(event) * (event.undo ? -1 : 1);
      });
      return balance;
    },
    $$added: function(snap) {
      var rec = $FirebaseArray.prototype.$$added.call(this, snap);
      rec._id = rec.$id;
      return rec;
    },
    latest: function(teamId) {
      for(var i = 0; i < this.$list.length; i++) {
        var event = this.$list[i];
        if(event.active && event.team === teamId) {
          switch(event.type) {
            case 'visit_street':
              return 'Straat bezocht: ' + data.streets[event.data.street].name;
            case 'buy_hotel':
             return 'Hotel gebouwd op: ' + data.streets[event.data.street].name;
            case 'receive_card':
              return 'Kanskaart ontvangen: ' + data.cards[event.data.card].name;
            case 'complete_task':
              return 'Opdracht voltooid: ' + data.tasks[event.data.task].name;
            case 'straight_money':
              return 'Direct geld ontvangen: ' + event.data.amount + ' ' + event.data.note;
            default:
              return 'Onbekende update';
          }
        }
      }
    },
    latestLocation: function(teamId) {
      for(var i = 0; i < this.$list.length; i++) {
        var event = this.$list[i];
        if(event.active && event.team === teamId && event.type === 'visit_street') {
          var street = data.streets[event.data.street];
          return street.name + ', ' + data.cities[street.city_id].name;
        }
      }
    }
  });

  return function(data) {
    this.data = data;
    var sync = $firebase(DataRoot.child('events'), {arrayFactory: EventsFactory});
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
