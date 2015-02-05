var monopolyControllers = angular.module('monopolyControllers', []);

monopolyControllers.constant('FIREBASE_URL','https://cognac-monopoly.firebaseio.com/');

monopolyControllers.controller("NavBarCtrl", function($firebase, FIREBASE_URL) {

  var sync = $firebase(new Firebase(FIREBASE_URL+"teams"));
  $scope.teams = sync.$asArray();
  
});

monopolyControllers.controller("OverzichtCtrl", function OverzichtCtrl($scope, $firebase, FIREBASE_URL) {

  var sync = $firebase(new Firebase(FIREBASE_URL+"teams"));
  $scope.teams = sync.$asArray();

  $scope.pageName = "Spel overzicht";
  $scope.pageDesc = "Overzicht van alle teams";
});

monopolyControllers.controller("TeamCtrl", function TeamCtrl($scope, $firebase, FIREBASE_URL) {
  $scope.pageName = "Team";
  $scope.pageDesc = "Overzicht van een team";
  
  var teamname = "-JfDtrADkuSmewWNGOB-";
  var sync = $firebase(new Firebase(FIREBASE_URL+"teams/"+teamname));
  $scope.team = sync.$asObject();
});

