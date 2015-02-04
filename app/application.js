"use strict";

var module = angular.module("cognac-monopoly", ["firebase"]);

module.constant('FIREBASE_URL','https://cognac-monopoly.firebaseio.com/');

module.directive("bootstrapNavbar", function() {
  return {
    restrict: "E",
    replace: true,
    transclude: true,
    templateUrl: "components/bootstrapNavbar.html",
    compile: function(element, attrs) {
      var li, liElements, links, index, length;

      liElements = $(element).find("#navigation-tabs li");
      for (index = 0, length = liElements.length; index < length; index++) {
        li = liElements[index];
        links = $(li).find("a");
        if (links[0].textContent === attrs.currentTab) $(li).addClass("active");
      }
    }
  }});
;

module.factory("teamlist", function($firebase, FIREBASE_URL) {

  var sync = $firebase(new Firebase(FIREBASE_URL+"teams"));
  return sync.$asArray();
  
});

module.controller("OverzichtCtrl", function OverzichtCtrl($scope, $firebase, FIREBASE_URL, teamlist) {
  $scope.teams = teamlist;

  $scope.pageName = "Spel overzicht";
  $scope.pageDesc = "Overzicht van alle teams";
});

module.controller("TeamCtrl", function TeamCtrl($scope, $firebase, FIREBASE_URL, teamlist) {
  $scope.teams = teamlist;

  $scope.pageName = "Team";
});

module.controller("AdminCtrl", function AdminCtrl($scope, $firebase, FIREBASE_URL, teamlist) {
  $scope.teams = teamlist;

  $scope.pageName = "Admin";
});
