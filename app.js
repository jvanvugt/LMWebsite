"use strict";

var monopoly = angular.module("monopoly", ["monopolyProviders", "monopolyControllers", "firebase", "ui.bootstrap", "ngRoute", 'uiGmapgoogle-maps']);

// let's create a re-usable factory that generates the $firebaseAuth instance
monopoly.factory("Auth", ["$firebaseAuth",
  function ($firebaseAuth) {
    return $firebaseAuth();
  }
]);

monopoly.run(["$rootScope", "$location", function ($rootScope, $location) {
  $rootScope.$on("$routeChangeError", function (event, next, previous, error) {
    // We can catch the error thrown when the $requireSignIn promise is rejected
    // and redirect the user back to the home page
    if (error === "AUTH_REQUIRED") {
      $location.path('/account');
    }
  });

}]);

monopoly.config(function (uiGmapGoogleMapApiProvider) {
  uiGmapGoogleMapApiProvider.configure({
    key: '!!!YOUR KEY HERE!!!',
    v: '3.17',
    libraries: 'weather,geometry,visualization'
  });
});

monopoly.config(function ($locationProvider, $routeProvider) {

  $locationProvider.html5Mode(true);

  $routeProvider.
    when('/team/:teamId', {
      templateUrl: 'partials/team.html',
      controller: 'TeamCtrl',
      resolve: {
        // controller will not be loaded until $waitForSignIn resolves
        // Auth refers to our $firebaseAuth wrapper in the example above
        "currentAuth": ["Auth", function (Auth) {
          // $waitForSignIn returns a promise so the resolve waits for it to complete
          return Auth.$requireSignIn();
        }]
      }
    }).
    when('/', {
      templateUrl: 'partials/overzicht.html',
      controller: 'OverzichtCtrl',
      resolve: {
        // controller will not be loaded until $waitForSignIn resolves
        // Auth refers to our $firebaseAuth wrapper in the example above
        "currentAuth": ["Auth", function (Auth) {
          // $waitForSignIn returns a promise so the resolve waits for it to complete
          return Auth.$requireSignIn();
        }]
      }
    }).
    when('/admin', {
      templateUrl: 'partials/admin.html',
      controller: 'AdminCtrl',
      resolve: {
        // controller will not be loaded until $waitForSignIn resolves
        // Auth refers to our $firebaseAuth wrapper in the example above
        "currentAuth": ["Auth", function (Auth) {
          // $waitForSignIn returns a promise so the resolve waits for it to complete
          return Auth.$requireSignIn();
        }]
      }
    }).
    when('/account', {
      templateUrl: 'partials/account.html',
      controller: 'AccountCtrl',
      resolve: {
        // controller will not be loaded until $waitForSignIn resolves
        // Auth refers to our $firebaseAuth wrapper in the example above
        "currentAuth": ["Auth", function (Auth) {
          // $waitForSignIn returns a promise so the resolve waits for it to complete
          return Auth.$waitForSignIn();
        }]
      }
    }).
    when('/error', {
      templateUrl: 'partials/error.html',
    }).
    otherwise({
      redirectTo: '/error'
    });
});

monopoly.directive("bootstrapNavbar", function () {
  return {
    restrict: "E",
    replace: true,
    transclude: true,
    templateUrl: "partials/bootstrapNavbar.html",
    compile: function (element, attrs) {
      var li, liElements, links, index, length;

      liElements = $(element).find("#navigation-tabs li");
      for (index = 0, length = liElements.length; index < length; index++) {
        li = liElements[index];
        links = $(li).find("a");
        if (links[0] && links[0].textContent === attrs.currentTab) $(li).addClass("active");
      }
    }
  }
});
;

monopoly.filter('objectOrderBy', function () {

  var isFunction = function (functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
  };

  return function (items, field, reverse) {
    var filtered = [];
    angular.forEach(items, function (item, id) {
      item._id = id;
      filtered.push(item);
    });
    filtered.sort(function (a, b) {
      if (isFunction(field)) {
        return (field(a) > field(b) ? 1 : -1);
      } else {
        return (a[field] > b[field] ? 1 : -1);
      }
    });
    if (reverse) filtered.reverse();
    return filtered;
  };
});
