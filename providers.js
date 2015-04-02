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
  this.game_over = $firebase(DataRoot.child('static').child('game_over')).$asObject();

  var chance = Chance(this);

  this.addUser = function(user) {
    DataRoot.child('users').push(user);
  };

  this.removeUser = function(userId) {
    DataRoot.child('users').child(userId).remove();
  };

  this.setUserRights = function(userId, isJudge, isAdmin) {
    var roles = DataRoot.child('users').child(userId).child('roles');
    roles.child('judge').set(isJudge);
    roles.child('admin').set(isAdmin);
  };

  this.addTeam = function(team, teamMembers) {
    team.active = true;
    var teamIdRef = DataRoot.child('teams').push(team);
    var data = this;
    teamIdRef.on('value', function (snapshot) {
      angular.forEach(teamMembers, function (userId) {
        data.teamAddMember(snapshot.key(), userId);
      });
    });
  };

  this.removeTeam = function(teamId) {
    console.log(teamId);
    DataRoot.child('teams').child(teamId).remove();
    var that = this;
    angular.forEach(data.users, function (user, id) {
      if (user.team === teamId)
        that.teamRemoveMember(id);
    });
  };

  this.teamAddMember = function(teamId, userId) {
    DataRoot.child('users').child(userId).child('team').set(teamId);
  };

  this.teamRemoveMember = function(userId) {
    DataRoot.child('users').child(userId).child('team').remove();
  };

  this.addCity = function(city) {
    DataRoot.child('cities').push(city);
  };

  this.removeCity = function(cityId) {
    DataRoot.child('cities').child(cityId).remove();
    angular.forEach(data.streets, function (street, id) {
      if (street.city_id === cityId)
        this.removeStreet(id);
    });
  };

  this.addStreet = function(street) {
    DataRoot.child('streets').push(street);
  };

  this.removeStreet = function(streetId) {
    DataRoot.child('streets').child(streetId).remove();
  };

  this.addTask = function(task) {
    DataRoot.child('tasks').push(task);
  };

  this.removeTask = function(taskId) {
    DataRoot.child('tasks').child(taskId).remove();
  };

  this.addCard = function(card) {
    DataRoot.child('cards').push(card);
  };

  this.removeCard = function(cardId) {
    DataRoot.child('cards').child(cardId).remove();
  };

  this.addSociety = function(society) {
    DataRoot.child('static/societies').push(society);
  };

  this.removeSociety = function(societyId) {
    DataRoot.child('static/societies').child(societyId).remove();
  };

  this.teamVisitStreet = function(teamId, streetId, timestamp) {
    DataRoot.child('streets').child(streetId).child('visited').child(teamId).set(timestamp);
    this.addEvent(teamId, 'visit_street', {street: streetId}, timestamp);
    if (this.streets[streetId].hotel_team_id && this.streets[streetId].hotel_team_id !== teamId)
      alert("Op deze straat is een hotel van een ander team!")

    if (chance.cardOnVisitStreet()) {
      this.teamGetCard(teamId, timestamp);
      alert("Het team heeft een nieuwe kaart ontvangen!");
    };
  };

  this.teamUnvisitStreet = function(teamId, streetId, timestamp) {
    this.teamUnbuyHotel(teamId, streetId, timestamp);
    DataRoot.child('streets').child(streetId).child('visited').child(teamId).remove();
    this.addEvent(teamId, 'visit_street', {street: streetId}, timestamp, true);
  };

  this.teamGetCard = function(teamId, timestamp) {
    var card = chance.objectProperty(this.teamAvailableCards(teamId));
    DataRoot.child('cards').child(card.id).child('received').child(teamId).set(timestamp);
    this.addEvent(teamId, 'receive_card', {card: card.id}, timestamp);
  };

  this.teamUngetCard = function(teamId, cardId, timestamp) {
    DataRoot.child('cards').child(cardId).child('received').child(teamId).remove();
    this.addEvent(teamId, 'receive_card', {card: cardId}, timestamp, true);
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
    if (this.events.balance(teamId) < this.constants.buy_hotel_costs) {
      alert("Niet genoeg geld om een hotel te kopen!");
      return;
    };
    if (this.teamNumberOfHotels(teamId) >= this.constants.max_hotels) {
      alert("Dit team bezit al het maximum aantal hotels!");
      return;
    };
    var streetref = DataRoot.child('streets').child(streetId)
    streetref.child('hotel_team_id').set(teamId);
    streetref.child('hotel_timestamp').set(timestamp);
    this.addEvent(teamId, 'buy_hotel', {street: streetId}, timestamp);
  };

  this.teamUnbuyHotel = function(teamId, streetId, timestamp) {
    var streetref = DataRoot.child('streets').child(streetId)
    streetref.child('hotel_team_id').remove();
    streetref.child('hotel_timestamp').remove();
    this.addEvent(teamId, 'buy_hotel', {street: streetId}, timestamp, true);

  };
  this.teamCompleteTask = function(teamId, taskId, taskValue, timestamp) {
    if (this.tasks[taskId] && this.tasks[taskId].repeated && this.tasks[taskId].repeated[teamId] >= this.tasks[taskId].repeatable) return;
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
    if (this.tasks[taskId] && this.tasks[taskId].repeated && this.tasks[taskId].repeated[teamId] <= 0) return;
    var taskref = DataRoot.child('tasks').child(taskId);
    var taskrepeatedteamref = taskref.child('repeated').child(teamId);
    var taskrankedteamref = taskref.child('ranked').child(teamId);
    taskrepeatedteamref.transaction(function(current) {
      return current-1;
    });
    this.addEvent(teamId, 'complete_task', {task: taskId}, timestamp, true);
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

  this.teamAvailableCards = function(teamId) {
    var availableCards = {};
    this.cards.forEach(function(card, id) {
      if(!card.received || !card.received[teamId])
        availableCards[id] = card;
    });
    return availableCards;
  };

  this.teamNumberOfHotels = function(teamId) {
    var numberOfHotels = 0;
    this.streets.forEach(function(street, id) {
      if(street.hotel_team_id === teamId)
        numberOfHotels += 1;
    });
    return numberOfHotels;
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

  this.teamRank = function(teamId) {
    var rank = 0;
    var teamBalance = data.events.balance(teamId);
    angular.forEach(data.teams, function (team, id) {
      if (data.events.balance(id) > teamBalance)
        rank += 1;
    });
    return rank;
  }

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

monopolyProviders.service("EventsFactory", function($FirebaseArray, $firebase, DataRoot, $filter) {

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
        if (!(data.streets[event.data.street] && data.streets[event.data.street].visited && data.streets[event.data.street].visited[event.team])) break;
        if (!(data.streets[event.data.street].hotel_team_id === event.team)) break;
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
        if (data.game_over.$value ||
              !(data.tasks[event.data.task] &&
              data.tasks[event.data.task].repeated &&
              data.tasks[event.data.task].repeated[event.team] > 0)) break;
        if (data.tasks[event.data.task].rankable) {
          var rank = data.taskRank(event.team, event.data.task);
          if (rank < data.tasks[event.data.task].rewards.length)
            value += data.tasks[event.data.task].rewards[rank];
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
      var ordered = $filter('objectOrderBy')(this.$list, 'timestamp', true);
      for(var i = 0; i < ordered.length; i++) {
        var event = ordered[i];
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
            case 'complete_card':
              return 'Kanskaart gehaald: ' + data.cards[event.data.card].name;
            default:
              return 'Onbekende update';
          }
        }
      }
    },
    latestLocation: function(teamId) {
      var ordered = $filter('objectOrderBy')(this.$list, 'timestamp', true);
      for(var i = 0; i < ordered.length; i++) {
        var event = ordered[i];
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
