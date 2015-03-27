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
  this.constants = $firebase(DataRoot.child('static').child('constants')).$asObject();
  this.societies = $firebase(DataRoot.child('static').child('societies')).$asObject();

  var chance = Chance(this);

  this.teamVisitStreet = function(teamId, streetId, timestamp) {
    DataRoot.child('streets').child(streetId).child('visitors').child(teamId).child('timestamp').set(timestamp);
    this.addTransaction(teamId, timestamp, {type: 'visit_street', street: streetId});
    //TODO: message if have to pay?

    if (chance.cardOnVisitStreet() || true) //TODO: REMOVE TRUE
      this.teamGetCard(teamId, timestamp); //TODO: message if get card
  };

  this.teamGetCard = function(teamId, timestamp) {
    var card = chance.objectProperty(this.teamAvailableCards(teamId));
    //var endTime = (new Date().getTime()) + (this.constants.card_max_time * 60); // TODO: doesn't work.
    DataRoot.child('cards').child(card.id).child('received').child(teamId).child('timestamp').set(timestamp);
    this.addTransaction(teamId, timestamp, {type: 'get_card', card: card.id});
  };

  this.teamAvailableCards = function(teamId) {
    var availableCards = {};
    this.cards.forEach(function(card, id) {
      if(!card.visitors || !card.visitors[teamId])
        availableCards[id] = card;
    });
    return availableCards;
  };

  this.teamBuyHotel = function(teamId, streetId, timestamp) {
    var streetref = DataRoot.child('streets').child(streetId)
    streetref.child('hotel_team_id').set(teamId);
    streetref.child('hotel_timestamp').set(timestamp);
    this.addTransaction(teamId, timestamp, {type: 'buy_hotel', street: streetId});
  };

  this.teamCompleteTask = function(teamId, taskId, taskValue, timestamp) {
    var taskcompletedteamref = DataRoot.child('tasks').child(taskId).child('completed').child(teamId);
    if (this.tasks[taskId].completed && this.tasks[taskId].completed[teamId]) {
      taskcompletedteamref.child('repeats').transaction(function(current) {
        return current+1;
      });
    } else {
      if (taskValue)
        taskcompletedteamref.child('rank_value').set(taskValue);
      taskcompletedteamref.child('repeats').set(1);
    }
    this.addTransaction(teamId, timestamp, {type: 'complete_task', task: taskId});
  };

  this.teamUncompleteTask = function(teamId, taskId, timestamp) {
    var taskcompletedteamref = DataRoot.child('tasks').child(taskId).child('completed').child(teamId);
    taskcompletedteamref.child('repeats').transaction(function(current) {
      return current-1;
    });
    this.addTransaction(teamId, timestamp, {type: 'complete_task', undo: true, task: taskId});
  };

  this.teamCompleteCard = function(teamId, cardId, timestamp) {
    DataRoot.child('cards').child(cardId).child('received').child(teamId).child('completed').set(timestamp);
    this.addTransaction(teamId, timestamp, {type: 'complete_card', card: cardId});
  };

  this.teamStraightMoney = function(teamId, amount, timestamp) {
    this.addTransaction(teamId, timestamp, {type: 'straight_money', amount: amount});
  };

  this.addTransaction = function(teamId, timestamp, transaction) {
    transaction['timestamp'] = timestamp;
    DataRoot.child('teams').child(teamId).child('transactions').push(transaction);
  };

  this.toggleTransaction = function(teamId, transactionId) {
    var transactionref = DataRoot.child('teams').child(teamId).child('transactions').child(transactionId);
    transactionref.child('inactive').transaction(function(current) {
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
      return Math.random() * 100 < data.constants.probability_card_per_street;
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
      var balance = Data.constants.buy_hotel_costs;
      angular.forEach(this.$list, function(transaction) {
        if (transaction.inactive)
          return;
        switch (transaction.type) {
          case 'visit_street':
            balance += Data.constants.visit_street_profits;
            if (Data.streets[transaction.street] &&
                Data.streets[transaction.street].hotel_timestamp &&
                Data.streets[transaction.street].hotel_timestamp <= transaction.timestamp) {
              balance -= Data.constants.visit_hotel_costs;
            }
            break;
          case 'buy_hotel':
            balance -= Data.constants.buy_hotel_costs;
            if (Data.streets[transaction.street] &&
                Data.streets[transaction.street].visitors) {
              angular.forEach(Data.streets[transaction.street].visitors, function (visit, visitor) {
                if (visit.timestamp &&
                    visit.timestamp >= transaction.timestamp)
                  balance += Data.constants.visit_hotel_profits;
              });
            }
            break;
          case 'straight_money':
            balance += transaction.amount;
          default:
            break;
        }
      });
      return balance;
    }
  });

  return function(teamId) {
    var sync = $firebase(DataRoot.child('teams').child(teamId).child('transactions'), {arrayFactory: TransactionsFactory});
    return sync.$asArray();
  }
});
