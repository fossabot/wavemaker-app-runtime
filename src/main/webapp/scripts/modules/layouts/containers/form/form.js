/*global WM, _*/

WM.module('wm.layouts.containers')
    .run(['$templateCache', function ($templateCache) {
        'use strict';
        $templateCache.put('template/layout/container/form.html',
                '<form role="form" data-ng-show="show" init-widget class="panel app-form" ng-class="[captionAlignClass, captionPositionClass, formClassName]"' +
                ' autocomplete="autocomplete" apply-styles="shell"' +
                ' ><div class="panel-heading" data-ng-if="title"><h4 class="form-header panel-title">{{title}}</h4></div>' +
                    '<div class="form-body panel-body" apply-styles="inner-shell">' +
                        '<wm-message scopedataset="statusMessage"></wm-message>' +
                        '<div wmtransclude></div>' +
                    '</div>' +
                    '</form>'
            );
    }])
    .directive('wmForm', ['$rootScope', 'PropertiesFactory', 'WidgetUtilService', '$compile', function ($rootScope, PropertiesFactory, WidgetUtilService, $compile) {
        'use strict';
        var widgetProps = PropertiesFactory.getPropertiesOf('wm.layouts.form', ['wm.base', 'wm.layouts', 'wm.base.events.touch']),
            notifyFor = {
                'captionsize': true,
                'novalidate': true,
                'autocomplete': true,
                'submitbutton': true,
                'resetbutton': true,
                'captionalign': true,
                'captionposition': true,
                'method': true,
                'action': true
            },
            submitBtnTemplate = '<wm-button class="form-submit" type="submit" caption="submit"></wm-button>';

        /* Define the property change handler. This function will be triggered when there is a change in the widget property */
        function propertyChangeHandler(scope, element, attrs, key, newVal) {
            var value, resetBtnTemplate;
            switch (key) {
            case 'captionsize':
                element.find('.form-group .app-label.ng-isolate-scope').each(function () {
                    WM.element(this).isolateScope().width = newVal;
                });
                break;
            case 'captionalign':
                scope.captionAlignClass = "align-" + newVal;
                break;
            case 'captionposition':
                scope.captionPositionClass = "position-" + newVal;
                break;
            case 'novalidate':
                if (newVal === true || newVal === 'true') {
                    element.attr('novalidate', '');
                } else {
                    element.removeAttr('novalidate');
                }
                break;
            case 'autocomplete':
                value = (newVal === true || newVal === 'true') ? 'on' : 'off';
                element.attr(key, value);
                break;
            case 'submitbutton':
                if (newVal === true || newVal === 'true') {
                    element.append($compile(submitBtnTemplate)(scope));
                } else {
                    element.find('.form-submit').remove();
                }
                break;
            case 'resetbutton':
                if (newVal === true || newVal === 'true') {
                    resetBtnTemplate = $compile('<wm-button class="reset-submit" type="reset" caption="reset" ' + (!scope.widgetid ? 'on-click="resetForm();"' : '') + ' ></wm-button>')(scope);
                    element.append(resetBtnTemplate);
                } else {
                    element.find('.reset-submit').remove();
                }
                break;
            case 'method':
                scope.widgetProps.enctype.show = newVal === 'post';
                break;
            case 'action':
                attrs.$set('action', newVal);
                break;
            }
        }

        /*Called by users programatically.*/
        function resetForm($s, element) {
            resetFormFields(element);
            _.forEach($s.formFields, function (dataValue) {
                if (dataValue.type === 'blob') {
                    WM.element(element).find('[name=' + dataValue.key + ']').val('');
                    dataValue.href  = '';
                    dataValue.value = null;
                } else {
                    dataValue.value = undefined;
                }
            });
            $s.formdata      = undefined;
            $s.statusMessage = undefined;
            $rootScope.$safeApply($s);
        }

        function resetFormFields(element) {
            var eleScope = element.scope();
            element.find('[role="input"]').each(function () {
                WM.element(this).isolateScope().reset();
            });
            $rootScope.$safeApply(eleScope);
        }

        function bindEvents(scope, element) {
            var params,
                formData,
                formVariable,
                fieldTarget,
                formWidget,
                field;
            element.on('submit', function (event) {
                formData     = {};
                formVariable = element.scope().Variables[scope.formvariable];
                if (scope.onSubmit || formVariable) {
                    //Get all form fields and prepare form data as key value pairs
                    element.find('[data-role="form-field"]').each(function () {
                        field       = WM.element(this).isolateScope().fieldDefConfig;
                        fieldTarget = field.target.split('.');
                        if (fieldTarget.length === 1 && !formData[field.name]) {
                            formData[field.name] = field.value;
                        } else {
                            if (formVariable.category === 'wm.Variable' && !formData[fieldTarget[1]]) {
                                formData[fieldTarget[1]] = field.value;
                            } else {
                                formData[fieldTarget[0]] = formData[fieldTarget[0]] || {};
                                //Check for if property already not exits
                                if (!formData[fieldTarget[0]][fieldTarget[1]]) {
                                    formData[fieldTarget[0]][fieldTarget[1]] = field.value;
                                }
                            }
                        }
                    });
                    //Form fields wont't contain grid widgets get those using attribute and add to form data
                    element.find('[isFormField="true"]').each(function () {
                        formWidget = WM.element(this).isolateScope();
                        fieldTarget = formWidget.name.split('.');
                        if (fieldTarget.length === 1) {
                            formData[formWidget.name] = formWidget.dataset;
                        } else {
                            formData[fieldTarget[0]] = formData[fieldTarget[0]] || {};
                            formData[fieldTarget[0]][fieldTarget[1]] = formWidget.dataset;
                        }
                    });
                    params = {$event: event, $scope: scope, $formData: formData};
                    //If on submit is there execute it and if it returns true do service variable invoke else return
                    if (scope.onSubmit && scope.onSubmit(params) === false) {
                        return;
                    }
                    scope.formdata = formData;
                    //If its a service variable call setInput and assign form data and invoke the service
                    if (formVariable && formVariable.category === 'wm.ServiceVariable') {
                        formVariable.setInput(formData);
                        formVariable.update({}, function () {
                            scope.statusMessage = {
                                'type'   : 'success',
                                'caption': scope.postmessage
                            };
                        }, function (errMsg) {
                            scope.statusMessage = {
                                'type'   : 'error',
                                'caption': errMsg
                            };
                        });
                    }
                }
            });
            /*clear the file uploader in the form*/
            element.bind('reset', function () {
                resetForm(scope, element);
            });
        }

        return {
            'restrict': 'E',
            'replace': true,
            'scope': {},
            'transclude': true,
            'template': WidgetUtilService.getPreparedTemplate.bind(undefined, 'template/layout/container/form.html'),
            'compile': function () {
                return {
                    'pre': function (scope) {
                        /*Applying widget properties to directive scope*/
                        scope.widgetProps = widgetProps;
                    },
                    'post': function (scope, element, attrs) {
                        scope.statusMessage = undefined;
                        /* register the property change handler */
                        WidgetUtilService.registerPropertyChangeListener(propertyChangeHandler.bind(undefined, scope, element, attrs), scope, notifyFor);

                        if (!scope.widgetid) {
                            bindEvents(scope, element);
                            scope.resetForm = resetForm.bind(undefined, scope, element);
                        }
                        WidgetUtilService.postWidgetCreate(scope, element, attrs);
                    }
                };
            }
        };
    }]);

/**
 * @ngdoc directive
 * @name wm.layouts.containers.directive:wmForm
 * @restrict E
 *
 * @description
 * The 'wmForm' directive defines a form in the layout.
 *
 * @scope
 *
 * @requires PropertiesFactory
 * @requires WidgetUtilService
 * @requires $compile
 *
 * @param {string=} title
 *                  Title of the form. This property is a bindable property.
 * @param {string=} name
 *                  Name of the form.
 * @param {string=} target
 *                  Defines the target for the form.
 * @param {string=} width
 *                  Width of the form.
 * @param {string=} height
 *                  Height of the form.
 * @param {string=} method
 *                  Defines the method to be used for submission of the form to the server [GET, POST].
 * @param {string=} action
 *                  Defines the action to be performed on successful submission of the form. This property is a bindable property.
 * @param {string=} enctype
 *                  enctype for form submit, i.e, encryption type for data submission, Example:"application/x-www-form-urlencoded", "multipart/form-data", "text/plain"
 * @param {string=} novalidate
 *                  Sets novalidate option for the form
 * @param {string=} autocomplete
 *                  Sets autocomplete for the form.
 * @param {string=} captionalign
 *                  Defines the alignment of the caption elements of widgets inside the form.<br>
 *                  Default value for captionalign is `left`.
 * @param {string=} captionposition
 *                  Defines the position of the caption elements of widgets inside the form.<br>
 *                  Default value for captionposition is `left`.
 * @param {string=} captionsize
 *                  Defines the size of the caption displayed inside the form.<br>
 *                  Default value for captionalign is `left`.
 * @param {string=} horizontalalign
 *                  Align the content of the accordion-content to left/right/center.
 *                  Default value: `left`.
 *                  Default value for autocomplete is `on`.
 * @param {string=} on-swipeup
 *                  Callback function for `swipeup` event.
 * @param {string=} on-swipedown
 *                  Callback function for `swipedown` event.
 * @param {string=} on-swiperight
 *                  Callback function for `swiperight` event.
 * @param {string=} on-swipeleft
 *                  Callback function for `swipeleft` event.
 * @param {string=} on-pinchin
 *                  Callback function for `pinchin` event.
 * @param {string=} on-pinchout
 *                  Callback function for `pinchout` event.
 * @param {string=} on-submit
 *                  Callback function for `submit` event.
 *
 *
 * @example
    <example module="wmCore">
        <file name="index.html">
            <div data-ng-controller="Ctrl" class="wm-app">
                <wm-form title="Form" class="panel-default" height="300">
                    <wm-layoutgrid>
                        <wm-gridrow>
                            <wm-gridcolumn>
                                <wm-composite>
                                    <wm-label class="col-md-3" caption="Name"></wm-label>
                                    <wm-container class="col-md-9">
                                        <wm-text tabindex="1" placeholder="Enter Name"></wm-text>
                                    </wm-container>
                                </wm-composite>
                            </wm-gridcolumn>
                        </wm-gridrow>
                        <wm-gridrow>
                            <wm-gridcolumn>
                                <wm-composite>
                                    <wm-label class="col-md-3" caption="Type"></wm-label>
                                    <wm-container class="col-md-9">
                                        <wm-select tabindex="3" dataset="Option 1, Option 2, Option 3" datavalue="Option 3"></wm-select>
                                    </wm-container>
                                </wm-composite>
                            </wm-gridcolumn>
                        </wm-gridrow>
                        <wm-gridrow>
                            <wm-gridcolumn>
                                <wm-composite horizontalalign="left">
                                    <wm-label class="col-md-3" caption="Description"></wm-label>
                                    <wm-container class="col-md-9">
                                        <wm-textarea tabindex="4" placeholder="Enter Description"></wm-textarea>
                                    </wm-container>
                                </wm-composite>
                            </wm-gridcolumn>
                        </wm-gridrow>
                    </wm-layoutgrid>
                    <wm-buttongroup horizontalalign="right" class="form-action col-md-12">
                        <wm-button caption="Reset" type="reset" class="btn-secondary"></wm-button>
                        <wm-button caption="Cancel" type="button" class="btn-warning"></wm-button>
                        <wm-button caption="Save" type="submit" class="btn-primary"></wm-button>
                    </wm-buttongroup>
                </wm-form>
            </div>
        </file>
         <file name="script.js">
             function Ctrl($scope) {}
         </file>
    </example>
 */
