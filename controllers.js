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

monopolyControllers.controller('OverzichtCtrl', function OverzichtCtrl($scope, $firebase, FIREBASE_URL) {

  var sync = $firebase(new Firebase(FIREBASE_URL+'teams'));
  $scope.teams = sync.$asArray();

  $scope.pageName = 'Spel overzicht';
  $scope.pageDesc = 'Overzicht van alle teams';
});

monopolyControllers.controller('TeamCtrl', function TeamCtrl($scope, $routeParams, $firebase, FIREBASE_URL, WithFilterableId) {
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

  $scope.cities = $firebase(new Firebase(FIREBASE_URL+'cities'), {arrayFactory: WithFilterableId}).$asArray();

  $scope.streets = $firebase(new Firebase(FIREBASE_URL+'streets'), {arrayFactory: WithFilterableId}).$asArray();

  var tasksync = $firebase(new Firebase(FIREBASE_URL+'tasks'));
  $scope.tasks = tasksync.$asArray();

  $scope.visitStreet = function(street) {
    ref.child('locations').child(street).child('visited').set(true);
    new Firebase(FIREBASE_URL+'streets').child(street).child('visitors').child(teamId).set(true);
    new Firebase(FIREBASE_URL+'streets').child(street).child('hotel_team_id').once('value', function(snap) {
      if (snap === null) return;
      ref.child('balance').transaction(function(current) {
        return current-20;
      });
      ref = new Firebase(FIREBASE_URL+'teams/'+snap.val());
      ref.child('balance').transaction(function(current) {
        return current+20;
      });
    });
  };

  $scope.hotelStreet = function(street) {
    ref.child('locations').child(street).child('hotel').set(true);
    new Firebase(FIREBASE_URL+'streets/'+street+'/hotel_team_id').set(teamId);
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

  $scope.visitedByTeamFilter = function(street) {
    var teamId = document.getElementById('teamUnvisit').value;
    var cityId = document.getElementById('cityUnvisit').value;
    return street && street.city_id === cityId && street.visitors && street.visitors[teamId];
  };

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
});
