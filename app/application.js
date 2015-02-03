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

var controllers = angular.module("controllers", []);

controllers.controller("OverzichtCtrl", function HomePageCtrlHomePageCtrl($scope) {
  $scope.pageName = "Overzicht";
});

controllers.controller("TeamCtrl", function SecondPageCtrl($scope) {
  $scope.pageName = "Team";
});

controllers.controller("AdminCtrl", function ThirdPageCtrl($scope) {
  $scope.pageName = "Admin";
});
