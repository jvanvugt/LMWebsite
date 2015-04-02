var monopolyControllers = angular.module('monopolyControllers', []);

monopolyControllers.controller('NavBarCtrl', function($scope, $firebase, FIREBASE_URL) {
  var sync = $firebase(new Firebase(FIREBASE_URL+'teams'));
  $scope.teams = sync.$asArray();

  $scope.logout = function() {
    new Firebase(FIREBASE_URL).unauth();
    location.reload(true);
  };
});

monopolyControllers.controller('OverzichtCtrl', function OverzichtCtrl($scope, $firebase, FIREBASE_URL, $firebaseAuth) {
  var ref = new Firebase(FIREBASE_URL);
  ref.child('users').child(ref.getAuth().uid).on('value', function(snap) {
    var user = snap.val();
    if(!user.roles || !user.roles.admin) {
      location.assign('/#/error');
    }
  });
  var auth = $firebaseAuth(new Firebase(FIREBASE_URL));
  var sync = $firebase(new Firebase(FIREBASE_URL+'teams'));
  $scope.teams = sync.$asArray();

  $scope.pageName = 'Spel overzicht';
  $scope.pageDesc = 'Overzicht van alle teams';
});

monopolyControllers.controller('TeamCtrl', function TeamCtrl($scope, $routeParams, Data, $firebaseAuth, FIREBASE_URL) {
  var ref = new Firebase(FIREBASE_URL);
  var auth = $firebaseAuth(ref);

  ref.child('users').child(ref.getAuth().uid).on('value', function(snap) {
    var user = snap.val();
    if(!(user.roles && (user.roles.judge || user.roles.admin))) {
      location.assign('/#/error');
    }
  });

  $scope.pageName = 'Team';
  $scope.pageDesc = 'Overzicht van een team';

  $scope.teamId = $routeParams.teamId;
  $scope.data = Data;

  $scope.submitAddStreet = function(data) {
    Data.teamVisitStreet($scope.teamId, data.streetId, Data.timestampOf(data));
  };

  $scope.submitAddHotel = function(data) {
    Data.teamBuyHotel($scope.teamId, data.streetId, Data.timestampOf(data))
  };

  $scope.submitAddTask = function(data) {
    console.log(data);
    Data.teamCompleteTask($scope.teamId, data.taskId, data.taskValue, Data.timestampOf(data));
  };

  $scope.incrementTask = function(taskId) {
    Data.teamCompleteTask($scope.teamId, taskId, null, Data.now());
  };

  $scope.decrementTask = function(taskId) {
    Data.teamUncompleteTask($scope.teamId, taskId, Data.now());
  };

  $scope.completeCard = function(cardId) {
    Data.teamCompleteCard($scope.teamId, cardId, Data.now());
  };

  $scope.uncompleteCard = function(cardId) {
    Data.teamUncompleteCard($scope.teamId, cardId, Data.now());
  };

  $scope.submitStraight = function(data) {
    Data.teamStraightMoney($scope.teamId, data.amount, data.note, Data.now());
  };

});

monopolyControllers.controller('AdminCtrl', function AdminCtrl($scope, Data, $firebase, FIREBASE_URL, $firebaseAuth) {
  var ref = new Firebase(FIREBASE_URL);
  var auth = $firebaseAuth(ref);
  $scope.pageName = 'Admin';
  $scope.pageDesc = 'Voer admin functies uit';

  ref.child('users').child(ref.getAuth().uid).on('value', function(snap) {
    var user = snap.val();
    if(!user.roles || !user.roles.admin) {
      location.assign('/#/error');
    }
  });

  $scope.data = Data;

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
    sync.$add(team).then(function(r){
     members = new Firebase(FIREBASE_URL+'teams/'+r.key()+'/members');
      teamMembers.forEach(function(userId) {
        $scope.addMember(userId, r.key());
      });
   });
  };

  $scope.addMember = function(userId, teamId) {
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

  $scope.addSociety = function(society) {
    new Firebase(FIREBASE_URL+'static/societies').push(society);
  }

  $scope.deleteSociety = function(societyId) {
    new Firebase(FIREBASE_URL+'static/societies/'+societyId).remove();
  }

  $scope.removeCardFromTeam = function(cardId, teamId) {
    new Firebase(FIREBASE_URL+ 'cards/' + cardId + '/received/'+teamId).remove();
  }

  $scope.changeRights = function(userId, isJudge, isAdmin) {
    var roles = new Firebase(FIREBASE_URL+'users/'+userId+'/roles');
    roles.child('judge').set(isJudge);
    roles.child('admin').set(isAdmin);
  }

});

monopolyControllers.controller('AccountCtrl', function AdminCtrl($scope, Data, $firebase, FIREBASE_URL, $firebaseAuth) {
  var ref = new Firebase(FIREBASE_URL);
  var auth = $firebaseAuth(ref);
  $scope.data = Data;

  $scope.login = function(user) {
    ref.authWithPassword(user, function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        console.log("Authenticated successfully with payload:", authData);
        location.assign('/#/overzicht');
      }
    });
  }

  $scope.createAccount = function(user) {
    if(user.password === user.password2) {
      ref.createUser({
        email: user.mail,
        password: user.password
      }, function(error, userData) {
        if (error) {
          console.log("Error creating user:", error);
        } else {
          console.log("Successfully created user account with uid:", userData.uid);
          alert('Je account is geregistreerd');
          delete user.password;
          delete user.password2;
          new Firebase(FIREBASE_URL+'users').child(userData.uid).set(user);
        }
      });
    } else {
      alert("Je moet twee keer hetzelfde wachtwoord invullen.");
    }

  };
});
