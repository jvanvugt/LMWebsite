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

  this.taskref = function(taskId) { return DataRoot.child('tasks').child(taskId) };

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
    DataRoot.child('cards').child(card.id).child('visitors').child(teamId).child('timestamp').set(timestamp);
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
    DataRoot.child('streets').child(streetId).child('hotel_team_id').set(teamId);
    DataRoot.child('streets').child(streetId).child('hotel_timestamp').set(timestamp);
    this.addTransaction(teamId, timestamp, {type: 'buy_hotel', street: streetId});
  };

  this.teamCompleteTask = function(teamId, taskId, taskValue) {
    
  };

  this.addTransaction = function(teamId, timestamp, transaction) {
    transaction['timestamp'] = timestamp;
    DataRoot.child('teams').child(teamId).child('transactions').push(transaction);
  };

  this.timestampOf = function(data) {
    if (data.timestamp)
      return data.timestamp.getTime();
    else
      return Firebase.ServerValue.TIMESTAMP;
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
        switch (transaction.type) {
          case 'visit_street':
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
