"use strict";

var monopoly = angular.module("monopoly", ["ngRoute", "monopolyControllers", "firebase"]);

monopoly.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/team/:teamId', {
        templateUrl: 'partials/team.html',
        controller: 'TeamCtrl'
      }).
      when('/overzicht', {
        templateUrl: 'partials/overzicht.html',
        controller: 'OverzichtCtrl'
      }).
      otherwise({
        templateURL: 'partials/overzicht.html',
        controller: 'OverzichtCtrl'
      });
    $locationProvider.html5Mode(true);
  }]);

monopoly.directive("bootstrapNavbar", function() {
  return {
    restrict: "E",
    replace: true,
    transclude: true,
    templateUrl: "partials/bootstrapNavbar.html",
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


