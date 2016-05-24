/*global WM, wm*/
/*jslint todo: true */
/**
 * @ngdoc service
 * @name wm.variables.$VariableService
 * @description
 * The `VariableService` provides the details about the variable based service apis
 */
wm.variables.services.VariableService = function (BaseService) {
    'use strict';
    return {
        /**
         * @ngdoc function
         * @name wm.variables.$VariableService#create
         * @methodOf wm.variables.$VariableService
         * @function
         *
         * @description
         * Takes array of variable objects to be created
         *
         * @param {object} params object containing parameters for the request (else throws an error message)
         * @param {function} successCallback to be called on success
         * @param {function} failureCallback to be called on failure
         */
        create: function (params, successCallback, failureCallback) {
            BaseService.send({
                target: 'VariableService',
                action: params.pageName === 'App' ? 'addAppVariables' : 'addPageVariables',
                urlParams: params,
                data: params.data
            }, successCallback, failureCallback);
        },
        /**
         * @ngdoc function
         * @name wm.variables.$VariableService#get
         * @methodOf wm.variables.$VariableService
         * @function
         *
         * @description
         * get map of variable objects
         *
         * @param {object} params object containing parameters for the request (else throws an error message)
         * @param {function} successCallback to be called on success
         * @param {function} failureCallback to be called on failure
         */
        get: function (params, successCallback, failureCallback) {
            BaseService.send({
                target: 'VariableService',
                action: params.pageName === 'App' ? 'getAppVariables' : 'getPageVariables',
                urlParams: params
            }, successCallback, failureCallback);
        },
        /**
         * @ngdoc function
         * @name wm.variables.$VariableService#update
         * @methodOf wm.variables.$VariableService
         * @function
         *
         * @description
         * Takes array of variable objects to be updated
         *
         * @param {object} params object containing parameters for the request (else throws an error message)
         * @param {function} successCallback to be called on success
         * @param {function} failureCallback to be called on failure
         */
        update: function (params, successCallback, failureCallback) {
            BaseService.send({
                target: 'VariableService',
                action: params.pageName === 'App' ? 'updateAppVariables' : 'updatePageVariables',
                urlParams: params,
                data: params.data
            }, successCallback, failureCallback);
        },
        /**
         * @ngdoc function
         * @name wm.variables.$VariableService#move
         * @methodOf wm.variables.$VariableService
         * @function
         *
         * @description
         * Takes array of variable objects to be moved
         *
         * @param {object} params object containing parameters for the request (else throws an error message)
         * @param {function} successCallback to be called on success
         * @param {function} failureCallback to be called on failure
         */
        move: function (params, successCallback, failureCallback) {
            BaseService.send({
                target: 'VariableService',
                action: params.pageName === 'App' ? 'moveAppVariables' : 'movePageVariables',
                urlParams: params,
                data: params.data
            }, successCallback, failureCallback);
        },
        /**
         * @ngdoc function
         * @name wm.variables.$VariableService#delete
         * @methodOf wm.variables.$VariableService
         * @function
         *
         * @description
         * Takes array of variable names to be deleted
         *
         * @param {object} params object containing parameters for the request (else throws an error message)
         * @param {function} successCallback to be called on success
         * @param {function} failureCallback to be called on failure
         */
        delete: function (params, successCallback, failureCallback) {
            BaseService.send({
                target: 'VariableService',
                action: params.pageName === 'App' ? 'deleteAppVariables' : 'deletePageVariables',
                urlParams: params
            }, successCallback, failureCallback);
        },
        /**
         * @ngdoc function
         * @name wm.variables.$VariableService#getServiceOpInfo
         * @methodOf wm.variables.$VariableService
         * @function
         *
         * @description
         * Get service operation info in run
         *
         * @param {object} params object containing parameters for the request (else throws an error message)
         * @param {function} successCallback to be called on success
         * @param {function} failureCallback to be called on failure
         */
        getServiceOpInfo: function (params, successCallback, failureCallback) {
            BaseService.send({
                target: 'VariableService',
                action: 'getServiceOpInfo',
                urlParams: params
            }, successCallback, failureCallback);
        },
        /**
         * @ngdoc function
         * @name wm.variables.$VariableService#getPrefabServiceOpInfo
         * @methodOf wm.variables.$VariableService
         * @function
         *
         * @description
         * Get service operation info in run
         * @param {object} params object containing parameters for the request (else throws an error message)
         * @param {function} successCallback to be called on success
         * @param {function} failureCallback to be called on failure
         */
        getPrefabServiceOpInfo: function (params, successCallback, failureCallback) {
            BaseService.send({
                target: 'VariableService',
                action: 'getPrefabServiceOpInfo',
                urlParams: params
            }, successCallback, failureCallback);
        }

    };
};