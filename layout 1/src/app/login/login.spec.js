var module = angular.mock.module;
var inject = angular.mock.inject;

describe('login', function() {
	
	var scope,  controller;
	
	beforeEach(inject(function($rootScope,$controller){
		scope = $rootScope.$new();		
		controller = $controller('login', { '$scope': scope });		
	}))
	
	it('should have a method to delete characters', function() {	
		expect(scope.backspace).toBeDefined();		
	})
});