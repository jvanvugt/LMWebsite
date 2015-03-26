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

monopolyControllers.factory('Data', ["$firebase", "FIREBASE_URL", "WithFilterableId", function ($firebase, FIREBASE_URL, WithFilterableId) {
  data = {};
  data.streets = $firebase(new Firebase(FIREBASE_URL+'streets')).$asObject();
  return data;
}]);

monopolyControllers.factory("TransactionsFactory", ["$FirebaseArray", "$firebase", "Data", function($FirebaseArray, $firebase, Data) {
  var TransactionsFactory = $FirebaseArray.$extendFactory({
    getBalance: function() {
      var balance = 0;
      angular.forEach(this.$list, function(transaction) {
        switch (transaction.type) {
          case 'visit_street':
            if (Data.streets[transaction.street] &&
                Data.streets[transaction.street].hotel_timestamp &&
                Data.streets[transaction.street].hotel_timestamp <= transaction.timestamp) {
              balance -= 20;
            }
            break;
          case 'buy_hotel':
            balance -= 50;
            if (Data.streets[transaction.street] &&
                Data.streets[transaction.street].visitors) {
              angular.forEach(Data.streets[transaction.street].visitors, function (visit, visitor) {
                if (visit.timestamp &&
                    visit.timestamp >= transaction.timestamp)
                  balance += 20;
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

  return function(ref) {
    var sync = $firebase(ref, {arrayFactory: TransactionsFactory});
    return sync.$asArray();
  }
}]);

monopolyControllers.controller('OverzichtCtrl', function OverzichtCtrl($scope, $firebase, FIREBASE_URL) {

  var sync = $firebase(new Firebase(FIREBASE_URL+'teams'));
  $scope.teams = sync.$asArray();

  $scope.pageName = 'Spel overzicht';
  $scope.pageDesc = 'Overzicht van alle teams';
});

monopolyControllers.controller('TeamCtrl', function TeamCtrl($scope, $routeParams, $firebase, FIREBASE_URL, WithFilterableId, TransactionsFactory) {
  $scope.pageName = 'Team';
  $scope.pageDesc = 'Overzicht van een team';

  teamId = $routeParams.teamId;
  $scope.teamId = teamId;
  var ref = new Firebase(FIREBASE_URL+'teams/'+teamId);
  $scope.team = $firebase(ref).$asObject();
  $scope.team.$loaded().then(function() {
   $scope.teamjudge = $firebase(new Firebase(FIREBASE_URL+'users/'+$scope.team.judge)).$asObject();
  });

  $scope.members = [];
  ref.child('members').on('value', function(snap) {
    for (var member in snap.val()) {
      $scope.members.push($firebase(new Firebase(FIREBASE_URL+'users/'+member)).$asObject());
    };
  });

  var consts = $firebase(new Firebase(FIREBASE_URL+'static/constants')).$asObject();

  $scope.cities = $firebase(new Firebase(FIREBASE_URL+'cities'), {arrayFactory: WithFilterableId}).$asArray();

  $scope.streets = $firebase(new Firebase(FIREBASE_URL+'streets'), {arrayFactory: WithFilterableId}).$asArray();

  $scope.societies = $firebase(new Firebase(FIREBASE_URL+'static/societies'), {arrayFactory: WithFilterableId}).$asArray();

  $scope.transactions = TransactionsFactory(ref.child('transactions'));

  var tasksync = $firebase(new Firebase(FIREBASE_URL+'tasks'));
  $scope.tasks = tasksync.$asArray();

  $scope.cards = $firebase(new Firebase(FIREBASE_URL+'cards'), {arrayFactory: WithFilterableId}).$asArray();

  $scope.teamCards = $firebase(ref.child('cards'), {arrayFactory: WithFilterableId}).$asArray();

  $scope.cardsObj = $firebase(new Firebase(FIREBASE_URL+'cards')).$asObject();

  $scope.visitStreet = function(street) {
    var timestamp = Firebase.ServerValue.TIMESTAMP;
    if (street.timestamp)
      timestamp = street.timestamp.getTime();
    new Firebase(FIREBASE_URL+'streets').child(street.id).child('visitors').child(teamId).child('timestamp').set(timestamp);
    ref.child('transactions').push({
      type: 'visit_street',
      timestamp: timestamp,
      street: street.id
    });

    var card;
    if(!$scope.cards.length) {
      console.error("No cards");
      console.log($scope.cards);
    } else {
      if(Math.random() * 100 < consts.probability_card_per_street) {
        while (true) {
          card = $scope.cards[Math.floor(Math.random()*$scope.cards.length)];
          var found = false;
          $scope.teamCards.forEach(function (tcard) {
            if(tcard.card_id === card.$id) {
              found = true;
            }
          });
          if(!found)
            break;
        }
        var endTime = (new Date().getTime()) + (consts.card_max_time * 60); // TODO: doesn't work.
        var teamCard = {
          card_id: card.$id,
          end_time: endTime
        };
        ref.child('cards').push(teamCard);
      }
    }
  };

  $scope.hotelStreet = function(street) {
    var timestamp = Firebase.ServerValue.TIMESTAMP;
    if (street.timestamp)
      timestamp = street.timestamp.getTime();
    new Firebase(FIREBASE_URL+'streets/'+street.id+'/hotel_team_id').set(teamId);
    new Firebase(FIREBASE_URL+'streets/'+street.id+'/hotel_timestamp').set(timestamp);
    ref.child('transactions').push({
      type: 'buy_hotel',
      timestamp: timestamp,
      street: street.id
    });
  };

  $scope.visitedStreetFilter = function(street) {
    return street.visitors && street.visitors[teamId];
  };

  $scope.completeTask = function(taskId,taskValue) {
    if (taskValue)
      new Firebase(FIREBASE_URL+'tasks/'+taskId+'/completed/'+teamId+'/rank_value').set(taskValue);
    new Firebase(FIREBASE_URL+'tasks/'+taskId+'/completed/'+teamId+'/repeats').set(1);
  };

  $scope.incrementTask = function(taskId) {
    var ref = new Firebase(FIREBASE_URL+'tasks/'+taskId+'/completed/'+teamId+'/repeats')
    ref.transaction(function(current) {
      return current+1;
    });
  };

  $scope.decrementTask = function(taskId) {
    var ref = new Firebase(FIREBASE_URL+'tasks/'+taskId+'/completed/'+teamId+'/repeats')
    ref.transaction(function(current) {
      return current-1;
    });
  };

  $scope.completedTaskFilter = function(task) {
    return task.completed && task.completed[teamId] && task.completed[teamId].repeats > 0;
  };

  $scope.isRankable = function(task) {
    return $scope.tasks.$getRecord(task) && $scope.tasks.$getRecord(task).rankable;
  };

  $scope.getResult = function(card, teamCard) {
    if(!card) return;
    if(card.is_positive && teamCard.success)
      return card.amount;
    else if(card.is_negative && !teamCard.success)
      return -card.amount;
    else
      return 0;
  }
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

  var constsync = $firebase(new Firebase(FIREBASE_URL+'static/constants')).$asObject();
  constsync.$bindTo($scope, "consts");

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

  $scope.addSociety = function(society) {
    new Firebase(FIREBASE_URL+'static/societies').push(society);
  }

  $scope.deleteSociety = function(societyId) {
    new Firebase(FIREBASE_URL+'static/societies/'+societyId).remove();
  }

});
