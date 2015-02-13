var monopolyControllers = angular.module('monopolyControllers', []);

monopolyControllers.constant('FIREBASE_URL','https://cognac-monopoly.firebaseio.com/');

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

monopolyControllers.controller('TeamCtrl', function TeamCtrl($scope, $routeParams, $firebase, FIREBASE_URL) {
  $scope.pageName = 'Team';
  $scope.pageDesc = 'Overzicht van een team';

  teamId = $routeParams.teamId; 
  console.log(teamId);
  var sync = $firebase(new Firebase(FIREBASE_URL+'teams/'+teamId));
  $scope.team = sync.$asObject();
});

monopolyControllers.controller('AdminCtrl', function AdminCtrl($scope, $firebase, FIREBASE_URL) {
  $scope.pageName = 'Admin';
  $scope.pageDesc = 'Voer admin functies uit';

  var sync = $firebase(new Firebase(FIREBASE_URL+'teams'));
  $scope.teams = sync.$asArray();

  $scope.addUser = function(user) {
    var sync = $firebase(new Firebase(FIREBASE_URL+'users'));
    sync.$push(user);
  };
});
