"use strict";

angular.module("navbarapp", ["controllers"])
  .directive("bootstrapNavbar", function() {
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

var controllers = angular.module("controllers", ["firebase"]);

controllers.controller("OverzichtCtrl", function OverzichtCtrl($scope, $firebase) {
  $scope.pageName = "Spel overzicht";
  $scope.pageDesc = "Overzicht van alle teams";
  
  var ref = new Firebase("https://cognac-monopoly.firebaseio.com/teams");
  var sync = $firebase(ref);
  $scope.teams = sync.$asArray();
});

controllers.controller("TeamCtrl", function TeamCtrl($scope) {
  $scope.pageName = "Team";
});

controllers.controller("AdminCtrl", function AdminCtrl($scope) {
  $scope.pageName = "Admin";
});
