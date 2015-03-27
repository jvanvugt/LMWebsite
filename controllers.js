var monopolyControllers = angular.module('monopolyControllers', []);

monopolyControllers.controller('NavBarCtrl', function($scope, $firebase, FIREBASE_URL) {
  var sync = $firebase(new Firebase(FIREBASE_URL+'teams'));
  $scope.teams = sync.$asArray();
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

  $scope.data = Data;

  $scope.users = Data.users;
  $scope.cities = Data.cities;
  $scope.streets = Data.streets;
  $scope.tasks = Data.tasks;
  $scope.societies = Data.societies;
  $scope.constants = Data.constants;
  $scope.cards = Data.cards;

  $scope.consts = $scope.constants;

  $scope.transactions = TransactionsFactory($scope.teamId);

  $scope.submitAddStreet = function(data) {
    Data.teamVisitStreet($scope.teamId, data.streetId, Data.timestampOf(data));
  };

  $scope.submitAddHotel = function(data) {
    Data.teamBuyHotel($scope.teamId, data.streetId, Data.timestampOf(data))
  };

  $scope.submitCompleteTask = function(data) {
    Data.teamCompleteTask($scope.teamId, data.taskId, data.taskValue)
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
