// Code goes here

var demo = angular.module('demo', ['ngRoute']);
demo.config(function($routeProvider){
  $routeProvider.otherwise( {
    templateUrl: 'main.html'
  })
//  $locationProvider.html5Mode(true);
})



