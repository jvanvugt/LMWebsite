var monopolyControllers = angular.module('monopolyControllers', []);

monopolyControllers.controller('NavBarCtrl', function ($scope, $firebaseArray, Data) {

  $scope.data = Data;

  $scope.teams = $firebaseArray(firebase.database().ref('teams'));
  firebase.auth().onAuthStateChanged(function(user) {
    $scope.isLoggedIn = Boolean(user);
  });
  $scope.logout = function () {
    firebase.auth().signOut();
    location.reload(true);
  };

  $scope.login = function () {
    location.assign('/account');
  }
});

monopolyControllers.controller('OverzichtCtrl', function OverzichtCtrl($scope, Data, uiGmapGoogleMapApi) {

  $scope.data = Data;
  firebase.database().ref('users/'+firebase.auth().currentUser.uid).on('value', function (snap) {
    var user = snap.val();
    if (!(user.roles && (user.roles.judge || user.roles.admin))) {
      location.assign('/#/error');
    }
  });

  $scope.pageName = 'Spel overzicht';
  $scope.pageDesc = 'Overzicht van alle teams';

  $scope.markers = [];

  $scope.balanceSort = function (team) {
    return data.events.balance(team._id);
  };

  uiGmapGoogleMapApi.then(function (maps) {
    $scope.map = { center: { latitude: 52.06, longitude: 5.07 }, zoom: 9 };
    var i = 0;
    angular.forEach(Data.teams, function (team, id) {
      var location = Data.events.latestStreetId(id);
      if (location) {

        var marker = {
          idKey: i,
          coords: {
            latitude: Data.streets[location].location.lat,
            longitude: Data.streets[location].location.lon
          },
          options: {
            title: team.name,
            draggable: true
          },
        };
        i++;
        $scope.markers.push(marker);
      }
    });
  });

  document.title = 'Overzicht | Levend Monopoly';

});

monopolyControllers.controller('TeamCtrl', function TeamCtrl($scope, $routeParams, Data) {
  firebase.database().ref('users/'+firebase.auth().currentUser.uid).on('value', function (snap) {
    var user = snap.val();
    if (!(user.roles && (user.roles.judge || user.roles.admin))) {
      location.assign('/#/error');
    }
  });

  $scope.pageName = 'Team';
  $scope.pageDesc = 'Overzicht van een team';

  $scope.teamId = $routeParams.teamId;
  $scope.data = Data;

  $scope.submitAddStreet = function (data) {
    Data.teamVisitStreet($scope.teamId, data.streetId, Data.timestampOf(data));
  };

  $scope.submitAddHotel = function (data) {
    Data.teamBuyHotel($scope.teamId, data.streetId, Data.timestampOf(data))
  };

  $scope.submitAddTask = function (data) {
    Data.teamCompleteTask($scope.teamId, data.taskId, data.taskValue, Data.timestampOf(data));
  };

  $scope.incrementTask = function (taskId) {
    Data.teamCompleteTask($scope.teamId, taskId, null, Data.now);
  };

  $scope.decrementTask = function (taskId) {
    Data.teamUncompleteTask($scope.teamId, taskId, Data.now);
  };

  $scope.completeCard = function (cardId) {
    Data.teamCompleteCard($scope.teamId, cardId, Data.now);
  };

  $scope.uncompleteCard = function (cardId) {
    Data.teamUncompleteCard($scope.teamId, cardId, Data.now);
  };

  $scope.submitStraight = function (data) {
    Data.teamStraightMoney($scope.teamId, data.amount, data.note, Data.now);
  };

  $scope.submitChangeTaskRankValue = function (taskId, rankValue) {
    Data.teamTaskSetRankValue($scope.teamId, taskId, rankValue);
  };

  setTimeout(function () { document.title = Data.teams[$scope.teamId].name + ' | Levend Monopoly'; }, 2000);
});

monopolyControllers.filter("streetInCity", function () {
  return function (streets, cityId) {
    var streetsCanAdd = {}
    angular.forEach(streets, function (street, id) {
      if (street.city_id === cityId)
        streetsCanAdd[id] = street;
    });
    return streetsCanAdd;
  };
});

monopolyControllers.filter("streetVisitedByTeam", function () {
  return function (streets, teamId) {
    var streetsCanAdd = {}
    angular.forEach(streets, function (street, id) {
      if (street.visited && street.visited[teamId])
        streetsCanAdd[id] = street;
    });
    return streetsCanAdd;
  };
});

monopolyControllers.filter("streetNotVisitedByTeam", function () {
  return function (streets, teamId) {
    var streetsCanAdd = {}
    angular.forEach(streets, function (street, id) {
      if (!(street.visited && street.visited[teamId]))
        streetsCanAdd[id] = street;
    });
    return streetsCanAdd;
  };
});

monopolyControllers.filter("streetNotHasHotel", function () {
  return function (streets) {
    var streetsCanAdd = {}
    angular.forEach(streets, function (street, id) {
      if (!street.hotel_team_id)
        streetsCanAdd[id] = street;
    });
    return streetsCanAdd;
  };
});

monopolyControllers.controller('AdminCtrl', function AdminCtrl($scope, Data, $firebaseObject) {
  $scope.pageName = 'Admin';
  $scope.pageDesc = 'Voer admin functies uit';

  firebase.database().ref('users/'+firebase.auth().currentUser.uid).on('value', function (snap) {
    var user = snap.val();
    if (!user.roles || !user.roles.admin) {
      location.assign('/#/error');
    }
  });

  $scope.data = Data;

  var constsync = $firebaseObject(firebase.database().ref('static/constants'));
  constsync.$bindTo($scope, "consts");

  $scope.submitAddUser = function (user) {
    Data.addUser(user);
  };

  $scope.submitRemoveUser = function (userId) {
    Data.removeUser(userId);
  };

  $scope.submitAddTeam = function (team, teamMembers) {
    Data.addTeam(team, teamMembers);
  };

  $scope.submitRemoveTeam = function (teamId) {
    Data.removeTeam(teamId);
  };

  $scope.submitAddMember = function (userId, teamId) {
    Data.teamAddMember(teamId, userId)
  }

  $scope.submitRemoveMember = function (userId, teamId) {
    Data.teamRemoveMember(userId);
  };

  $scope.submitAddCity = function (city) {
    Data.addCity(city);
  };

  $scope.submitRemoveCity = function (cityId) {
    Data.removeCity(cityId);
  };

  $scope.submitAddStreet = function (street) {
    Data.addStreet(street);
  }

  $scope.submitRemoveStreet = function (streetId) {
    Data.removeStreet(streetId);
  }

  $scope.submitAddTask = function (task) {
    task.rewards = task.rewards.split(' ').map(Number);
    Data.addTask(task);
  }

  $scope.submitRemoveTask = function (taskId) {
    Data.removeTask(taskId);
  }

  $scope.submitAddCard = function (card) {
    Data.addCard(card);
  }

  $scope.submitRemoveCard = function (cardId) {
    Data.removeCard(cardId);
  }

  $scope.submitAddSociety = function (society) {
    Data.addSociety(society);
  }

  $scope.submitRemoveSociety = function (society) {
    Data.removeSociety(society);
  }

  $scope.submitRemoveHotel = function (streetId) {
    var teamId = Data.streets[streetId].hotel_team_id;
    Data.teamUnbuyHotel(teamId, streetId, Data.now);
  }

  $scope.submitUnvisitStreet = function (streetId, teamId) {
    Data.teamUnvisitStreet(teamId, streetId, Data.now);
  }

  $scope.submitRemoveCardFromTeam = function (teamId, cardId) {
    Data.teamUngetCard(teamId, cardId, Data.now);
  }

  $scope.submitGiveRights = function (userId, isJudge, isAdmin) {
    Data.setUserRights(userId, isJudge, isAdmin);
  }

  document.title = 'Admin | Levend Monopoly';

});

monopolyControllers.controller('AccountCtrl', function AdminCtrl($scope, Data) {
  $scope.data = Data;

  $scope.login = function (user, callback) {
    firebase.auth().signInWithEmailAndPassword(user.email, user.password).then((authData) => {
      console.log("Authenticated successfully with payload:", authData);
      if (callback) callback();
      location.assign('/');
    }).catch((error) => {
      alert('Login failed: ' + error);
      console.log("Login Failed!", error);
    });
  }

  $scope.createAccount = function (user) {
    if (user.password === user.password2) {
      firebase.auth().createUserWithEmailAndPassword(user.mail, user.password).then((userData) => {
        console.log("Successfully created user account with uid:", userData.uid);
        alert('Je account is geregistreerd');
        $scope.login({ email: user.mail, password: user.password }, function () {
          delete user.password;
          delete user.password2;
          console.log(user);
          firebase.database().ref('users/'+userData.uid).set(user);
        });
      }).catch((error) => {
        console.log("Error creating user:", error);
      });
    } else {
      alert("Je moet twee keer hetzelfde wachtwoord invullen.");
    }
  };
});
