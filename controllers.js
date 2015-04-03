var monopolyControllers = angular.module('monopolyControllers', []);

monopolyControllers.controller('NavBarCtrl', function($scope, $firebase, FIREBASE_URL, Data) {

  $scope.data = Data;

  var sync = $firebase(new Firebase(FIREBASE_URL+'teams'));
  $scope.teams = sync.$asArray();
  var ref = new Firebase(FIREBASE_URL);
  $scope.isLoggedIn = ref.getAuth();
  $scope.logout = function() {
    new Firebase(FIREBASE_URL).unauth();
    location.reload(true);
  };

  $scope.login = function() {
    location.assign('/account');
  }
});

monopolyControllers.controller('OverzichtCtrl', function OverzichtCtrl($scope, Data, $firebase, FIREBASE_URL, $firebaseAuth, uiGmapGoogleMapApi) {

  $scope.data = Data;
  var ref = new Firebase(FIREBASE_URL);
  ref.child('users').child(ref.getAuth().uid).on('value', function(snap) {
    var user = snap.val();
    if(!user.roles || !user.roles.admin) {
      location.assign('/#/error');
    }
  });

  var auth = $firebaseAuth(ref);

  $scope.pageName = 'Spel overzicht';
  $scope.pageDesc = 'Overzicht van alle teams';

  $scope.markers = [];
  /*
  uiGmapGoogleMapApi.then(function(maps) {
      $scope.map = { center: { latitude: 52.06, longitude: 5.07 }, zoom: 9 };
      var geocoder = new google.maps.Geocoder();
      var i = 0;
      angular.forEach(Data.teams, function(team, id){
        geocoder.geocode( { 'address': Data.events.latestLocation(id)}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          var marker = {
              idKey: i,
              coords: {
                latitude: results[0].geometry.location.k,
                longitude: results[0].geometry.location.B,
              }
          };
          i++;
          $scope.markers.push(marker);
        } else {
          alert("Geocode was not successful for the following reason: " + status);
        }
      });

      });

  });
  */



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
    Data.teamCompleteTask($scope.teamId, data.taskId, data.taskValue, Data.timestampOf(data));
  };

  $scope.incrementTask = function(taskId) {
    Data.teamCompleteTask($scope.teamId, taskId, null, Data.now);
  };

  $scope.decrementTask = function(taskId) {
    Data.teamUncompleteTask($scope.teamId, taskId, Data.now);
  };

  $scope.completeCard = function(cardId) {
    Data.teamCompleteCard($scope.teamId, cardId, Data.now);
  };

  $scope.uncompleteCard = function(cardId) {
    Data.teamUncompleteCard($scope.teamId, cardId, Data.now);
  };

  $scope.submitStraight = function(data) {
    Data.teamStraightMoney($scope.teamId, data.amount, data.note, Data.now);
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

  var constsync = $firebase(new Firebase(FIREBASE_URL+'static/constants')).$asObject();
  constsync.$bindTo($scope, "consts");

  $scope.submitAddUser = function(user) {
    Data.addUser(user);
  };

  $scope.submitRemoveUser = function(userId) {
    Data.removeUser(userId);
  };

  $scope.submitAddTeam = function(team, teamMembers) {
    Data.addTeam(team, teamMembers);
  };

  $scope.submitRemoveTeam = function(teamId) {
    Data.removeTeam(teamId);
  };

  $scope.submitAddMember = function(userId, teamId) {
    Data.teamAddMember(teamId, userId)
  }

  $scope.submitRemoveMember = function(userId, teamId) {
    Data.teamRemoveMember(userId);
  };

  $scope.submitAddCity = function(city) {
    Data.addCity(city);
  };

  $scope.submitRemoveCity = function(cityId) {
    Data.removeCity(cityId);
  };

  $scope.submitAddStreet = function(street) {
    Data.addStreet(street);
  }

  $scope.submitRemoveStreet = function(streetId) {
    Data.removeStreet(streetId);
  }

  $scope.submitAddTask = function(task) {
    task.rewards = task.rewards.split(' ').map(Number);
    Data.addTask(task);
  }

  $scope.submitRemoveTask = function(taskId) {
    Data.removeTask(taskId);
  }

  $scope.submitAddCard = function(card) {
    Data.addCard(card);
  }

  $scope.submitRemoveCard = function(cardId) {
    Data.removeCard(cardId);
  }

  $scope.submitAddSociety = function(society) {
    Data.addSociety(society);
  }

  $scope.submitRemoveSociety = function(society) {
    Data.removeSociety(society);
  }

  $scope.submitRemoveHotel = function(streetId) {
    var teamId = Data.streets[streetId].hotel_team_id;
    Data.teamUnbuyHotel(teamId, streetId, Data.now);
  }

  $scope.submitUnvisitStreet = function(streetId, teamId) {
    Data.teamUnvisitStreet(teamId, streetId, Data.now);
  }

  $scope.submitRemoveCardFromTeam = function(teamId, cardId) {
    Data.teamUngetCard(teamId, cardId, Data.now);
  }

  $scope.submitGiveRights = function(userId, isJudge, isAdmin) {
    Data.setUserRights(userId, isJudge, isAdmin);
  }

});

monopolyControllers.controller('AccountCtrl', function AdminCtrl($scope, Data, $firebase, FIREBASE_URL, $firebaseAuth) {
  var ref = new Firebase(FIREBASE_URL);
  var auth = $firebaseAuth(ref);
  $scope.data = Data;

  $scope.login = function(user, callback) {
    ref.authWithPassword(user, function(error, authData) {
      if (error) {
        alert('Login failed: ' + error);
        console.log("Login Failed!", error);
      } else {
        console.log("Authenticated successfully with payload:", authData);
        if (callback) callback();
        location.assign('/');
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
          $scope.login({email: user.mail, password: user.password}, function () {
            delete user.password;
            delete user.password2;
            console.log(user);
            new Firebase(FIREBASE_URL+'users').child(userData.uid).set(user);
          });
        }
      });
    } else {
      alert("Je moet twee keer hetzelfde wachtwoord invullen.");
    }

  };
});
