var monopolyControllers = angular.module('monopolyControllers', []);

monopolyControllers.constant('FIREBASE_URL','https://cognac-monopoly.firebaseio.com/');

monopolyControllers.controller('NavBarCtrl', function($scope, $firebase, FIREBASE_URL) {
  var sync = $firebase(new Firebase(FIREBASE_URL+'teams'));
  $scope.teams = sync.$asArray();
});

monopolyControllers.factory('WithFilterableId', function($FirebaseArray, $firebaseUtils) {
   return $FirebaseArray.$extendFactory({
       $$added:  function(snap) {
           var rec = $FirebaseArray.prototype.$$added.call(this, snap);
           rec._id = rec.$id;
           return rec;
       }
   });
});

monopolyControllers.service('DataRoot', function ($firebase, FIREBASE_URL) {
  return new Firebase(FIREBASE_URL);
});

monopolyControllers.service('Data', function (DataRoot, $firebase, WithFilterableId) {
  var that = this;

  this.teams = $firebase(DataRoot.child('teams')).$asObject();
  this.users = $firebase(DataRoot.child('users')).$asObject();
  this.cities = $firebase(DataRoot.child('cities')).$asObject();
  this.streets = $firebase(DataRoot.child('streets')).$asObject();
  this.tasks = $firebase(DataRoot.child('tasks')).$asObject();
  this.cards = $firebase(DataRoot.child('cards')).$asObject();
  this.constants = $firebase(DataRoot.child('static').child('constants')).$asObject();

  this.teamref = function(teamId) { return DataRoot.child('teams').child(teamId) };
  this.streetref = function(streetId) { return DataRoot.child('streets').child(streetId) };
  this.taskref = function(taskId) { return DataRoot.child('tasks').child(taskId) };
});

monopolyControllers.factory("TransactionsFactory", function($FirebaseArray, $firebase, Data) {
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
    var sync = $firebase(Data.teamref(teamId).child('transactions'), {arrayFactory: TransactionsFactory});
    return sync.$asArray();
  }
});

monopolyControllers.controller('OverzichtCtrl', function OverzichtCtrl($scope, $firebase, FIREBASE_URL) {
  var sync = $firebase(new Firebase(FIREBASE_URL+'teams'));
  $scope.teams = sync.$asArray();

  $scope.pageName = 'Spel overzicht';
  $scope.pageDesc = 'Overzicht van alle teams';
});

monopolyControllers.controller('TeamCtrl', function TeamCtrl($scope, $routeParams, Data, WithFilterableId, TransactionsFactory) {
  $scope.pageName = 'Team';
  $scope.pageDesc = 'Overzicht van een team';

  $scope.teamId = $routeParams.teamId;

  $scope.teams = Data.teams;
  $scope.users = Data.users;
  $scope.cities = Data.cities;
  $scope.streets = Data.streets;
  $scope.tasks = Data.tasks;

  var teamref = Data.teamref($scope.teamId);
  $scope.transactions = TransactionsFactory($scope.teamId);

  $scope.visitStreet = function(street) {
    var timestamp = Firebase.ServerValue.TIMESTAMP;
    if (street.timestamp)
      timestamp = street.timestamp.getTime();
    Data.streetref(street.id).child('visitors').child($scope.teamId).child('timestamp').set(timestamp);
    teamref.child('transactions').push({
      type: 'visit_street',
      timestamp: timestamp,
      street: street.id
    });
  };

  $scope.hotelStreet = function(street) {
    var timestamp = Firebase.ServerValue.TIMESTAMP;
    if (street.timestamp)
      timestamp = street.timestamp.getTime();
    Data.streetref(street.id).child('hotel_team_id').set($scope.teamId);
    Data.streetref(street.id).child('hotel_timestamp').set(timestamp);
    teamref.child('transactions').push({
      type: 'buy_hotel',
      timestamp: timestamp,
      street: street.id
    });
  };

  $scope.completeTask = function(taskId,taskValue) {
    if (taskValue)
      Data.taskref(taskId).child('completed').child($scope.teamId).child('rank_value').set(taskValue);
    Data.taskref(taskId).child('completed').child($scope.teamId).child('repeats').set(1);
  };

  $scope.incrementTask = function(taskId) {
    var ref = Data.taskref(taskId).child('completed').child($scope.teamId).child('repeats');
    ref.transaction(function(current) {
      return current+1;
    });
  };

  $scope.decrementTask = function(taskId) {
    var ref = Data.taskref(taskId).child('completed').child($scope.teamId).child('repeats');
    ref.transaction(function(current) {
      return current-1;
    });
  };
});

monopolyControllers.controller('AdminCtrl', function AdminCtrl($scope, $firebase, FIREBASE_URL) {
  $scope.pageName = 'Admin';
  $scope.pageDesc = 'Voer admin functies uit';

  var societysync = $firebase(new Firebase(FIREBASE_URL+'static/societies'));
  $scope.societies = societysync.$asArray();

  var teamsync = $firebase(new Firebase(FIREBASE_URL+'teams'));
  $scope.teams = teamsync.$asArray();

  var usersync = $firebase(new Firebase(FIREBASE_URL+'users'));
  $scope.users = usersync.$asArray();

  var citysync = $firebase(new Firebase(FIREBASE_URL+'cities'));
  $scope.cities = citysync.$asArray();

  var streetsync = $firebase(new Firebase(FIREBASE_URL+'streets'));
  $scope.streets = streetsync.$asArray();

  var tasksync = $firebase(new Firebase(FIREBASE_URL+'tasks'));
  $scope.tasks = tasksync.$asArray();

  var cardsync = $firebase(new Firebase(FIREBASE_URL+'cards'));
  $scope.cards = cardsync.$asArray();

  $scope.streetInCityFilter = function(street) {
    var cityId = document.getElementById('cityStreetRemove').value;
    return street && street.city_id === cityId;
  }

  $scope.visitedByTeamFilter = function(street) {
    var teamId = document.getElementById('teamUnvisit').value;
    var cityId = document.getElementById('cityUnvisit').value;
    return street && street.city_id === cityId && street.visitors && street.visitors[teamId];
  };

  $scope.hasHotelFilter = function(street) {
    return street.hotel_team_id && street.hotel_timestamp;
  }

  $scope.judgeFilter = function (user) {
    return user.roles && user.roles.judge;
  };

  $scope.eligibleMemberFilter = function (user) {
    return !$scope.judgeFilter(user) && !user.team;
  };

  $scope.addUser = function(user) {
    var sync = new Firebase(FIREBASE_URL+'users');
    sync.push(user);
  };

  $scope.deleteUser = function(userId) {
   var user = new Firebase(FIREBASE_URL+'users/'+userId);
   user.child('team').once('value', function(snap) {
     new Firebase(FIREBASE_URL+'teams/'+snap.val()+'/members/'+userId).remove();
     user.remove();
   });
  };

  $scope.addTeam = function(team, teamMembers) {
    var sync = $firebase(new Firebase(FIREBASE_URL+'teams')).$asArray();
    team.active = true;
    team.balance = 0;
    sync.$add(team).then(function(r){
     members = new Firebase(FIREBASE_URL+'teams/'+r.key()+'/members');
      teamMembers.forEach(function(userId) {
        $scope.addMember(userId, r.key());
      });
   });
  };

  $scope.addMember = function(userId, teamId) {
    new Firebase(FIREBASE_URL+'teams/'+ teamId + '/members').child(userId).set(true);
    new Firebase(FIREBASE_URL+'users/'+userId+'/team').set(teamId);
  }

  $scope.deleteTeam = function(teamId) {
    var teamMembers = new Firebase(FIREBASE_URL+'teams/'+teamId+'/members');
    teamMembers.on('value', function(snap) {
      if (snap.numChildren() === 0)
        teamMembers.parent().remove();
    });

    teamMembers.on('child_added', function(snap) {
      new Firebase(FIREBASE_URL+'users/'+snap.key()+'/team').remove();
      snap.ref().remove();
      teamMembers.on('value', function(snap) {
        if (snap.numChildren() === 0)
          teamMembers.parent().remove();
      });
    });
  };

  $scope.deleteTeamMember = function(memberId, teamId) {
    new Firebase(FIREBASE_URL+'users/'+memberId+'/team').remove();
    new Firebase(FIREBASE_URL+'teams/' + teamId + '/members/' + memberId).remove();
  };

  $scope.addCity = function(city) {
    new Firebase(FIREBASE_URL+'cities').push(city);
  }

  $scope.deleteCity = function(cityId) {
    new Firebase(FIREBASE_URL+'cities/'+cityId).remove();
    var streets = new Firebase(FIREBASE_URL+'streets');
    streets.on('child_added', function(snap) {
      if(snap.val().city_id === cityId)
          snap.ref().remove();
    });
  }

  $scope.addStreet = function(street) {
    var street_id = new Firebase(FIREBASE_URL+'streets').push(street).key();
    new Firebase(FIREBASE_URL+'cities/'+street.city_id+'/streets/'+street_id).set(true);
  }

  $scope.deleteStreet = function(streetId) {
    new Firebase(FIREBASE_URL+'streets/'+streetId).remove();
  }

  $scope.addTask = function(task) {
    new Firebase(FIREBASE_URL+'tasks').push(task);
  }

  $scope.deleteTask = function(taskId) {
    new Firebase(FIREBASE_URL+'tasks/'+taskId).remove();
  }

  $scope.addCard = function(card) {
    new Firebase(FIREBASE_URL+'cards').push(card);
  }

  $scope.deleteCard = function(cardId) {
    new Firebase(FIREBASE_URL+'cards/'+cardId).remove();
  }

  $scope.unvisitStreet = function(streetId, teamId) {
    new Firebase(FIREBASE_URL+'streets/'+streetId+'/visitors/'+teamId).remove();
  }

  $scope.removeHotel = function(streetId) {
    var street = new Firebase(FIREBASE_URL+'streets/'+streetId);
    street.child('hotel_timestamp').remove();
    street.child('hotel_team_id').remove();
  }

});
