/*global WM, moment, _ */
/*Directive for datetime */

WM.module('wm.widgets.form')
    .run(['$templateCache', function ($templateCache) {
        'use strict';
        $templateCache.put('template/widget/form/datetime.html',
            '<div class="app-datetime input-group" init-widget has-model apply-styles role="input"' +
            ' title="{{hint}}" data-ng-show="show" data-ng-model="_proxyModel">' + /* _proxyModel is a private variable inside this scope */
                '<input class="form-control app-textbox display-input" data-ng-model="_displayModel" accesskey="{{shortcutkey}}">' +
                '<input class="form-control app-textbox app-dateinput ng-hide" data-ng-change="selectDate($event)" date-disabled="excludeDays(date) || excludeDates(date)" data-ng-model="_dateModel" ' +
                    ' uib-datepicker-popup min-date=mindate max-date=maxdate is-open="isDateOpen" show-weeks="{{showweeks}}">' +
                '<div uib-dropdown is-open="isTimeOpen" class="dropdown">' +
                    '<div uib-dropdown-menu>' +
                        '<uib-timepicker data-ng-model="_timeModel" hour-step="hourstep" minute-step="minutestep" show-meridian="ismeridian" show-seconds="showseconds" data-ng-change="selectTime($event)"></uib-timepicker>' +
                    '</div>' +
                '</div>' +
                /*Holder for the model for submitting values in a form*/
                '<input class="model-holder ng-hide" data-ng-disabled="disabled" data-ng-model="_model_">' +
                '<span class="input-group-btn">' +
                    '<button type="button" class="btn btn-default btn-date"><i class="glyphicon glyphicon-calendar"></i></button>' +
                    '<button type="button" class="btn btn-default btn-time uib-dropdown-toggle"><i class="glyphicon glyphicon-time"></i></button>' +
                '</span>' +
            '</div>'
            );
        $templateCache.put('template/device/widget/form/datetime.html',
            '<input type="datetime-local" class="form-control app-textbox app-dateinput" data-ng-show="show" role="input" data-ng-model="_proxyModel" has-model step="any"' +
            ' init-widget data-ng-change="updateModel();_onChange({$event: $event, $scope: this});">'
            );
    }]).directive('wmDatetime', ['$rootScope', 'PropertiesFactory', 'WidgetUtilService', '$timeout', '$templateCache', '$filter', 'FormWidgetUtils', function ($rs, PropertiesFactory, WidgetUtilService, $timeout, $templateCache, $filter, FormWidgetUtils) {
        'use strict';
        var widgetProps = PropertiesFactory.getPropertiesOf('wm.datetime', ['wm.base', 'wm.base.editors.abstracteditors', 'wm.base.datetime']),
            notifyFor = {
                'readonly': true,
                'disabled': true,
                'autofocus': true,
                'timestamp': true,
                'excludedates': true,
                'datepattern': true
            };

        if ($rs.isMobileApplicationType) {
            /*date pattern is not supported for native date widget*/
            widgetProps.datepattern.show = false;
            widgetProps.hourstep.show = false;
            widgetProps.minutestep.show = false;
        }

        function _formatDateTime(scope) {
            var date,
                time,
                dateString,
                timeString,
                value;
            if (scope._timeModel || scope._dateModel) {
                time = scope._timeModel ? new Date(scope._timeModel) : new Date();
                date = scope._dateModel ? new Date(scope._dateModel) : new Date();
                dateString = $filter('date')(date, 'yyyy-MM-dd');
                timeString = $filter('date')(time, 'HH:mm:ss');
                value = moment(dateString + ' ' + timeString).valueOf();
                scope.timestamp = value;
                if (scope.datepattern && scope.datepattern !== 'timestamp') {
                    scope._displayModel = $filter('date')(value, scope.datepattern);
                } else {
                    scope._displayModel = value;
                }
                if (scope.outputformat && scope.outputformat !== 'timestamp') {
                    scope._proxyModel = $filter('date')(value, scope.outputformat);
                } else {
                    scope._proxyModel = value;
                }
            } else {
                scope._displayModel = undefined;
                scope._proxyModel = undefined;
            }
        }

        function propertyChangeHandler(scope, element, key, newVal, oldVal) {
            var inputEl = element.find('input'),
                buttonEl = element.find('button');
            switch (key) {
            case 'readonly':
            case 'disabled':
                inputEl.attr(key, newVal);
                buttonEl.attr('disabled', newVal);
                // prevent the click events on decrement/increment buttons
                element.css('pointer-events', newVal ? 'none' : 'all');
                break;
            case 'autofocus':
                inputEl.first().attr(key, newVal);
                break;
            case 'timestamp':
                /*Single equal is used not to update model if newVal and oldVal have same values with string and integer types*/
                if (newVal != oldVal) {
                    scope._model_ = newVal;
                }
                break;
            case 'excludedates':
                scope.proxyExcludeDates = FormWidgetUtils.getProxyExcludeDates(newVal);
                break;
            case 'datepattern':
                scope.showseconds = _.includes(newVal, 'ss');
                scope.ismeridian  = _.includes(newVal, 'hh');
                _formatDateTime(scope);
                break;
            }
        }

        function _onClick(scope, evt) {
            evt.stopPropagation();
            if (scope.onClick) {
                scope.onClick({$event: evt, $scope: scope});
            }
        }

        /*On click of date icon button, open the date picker popup*/
        function _onDateClick(scope, evt) {
            evt.stopPropagation();
            var dateOpen = scope.isDateOpen;
            $timeout(function () {
                WM.element(document).trigger('click');
                scope.isDateOpen = !dateOpen;
                scope.isTimeOpen = false;
            });
        }

        /*On click of time icon button, open the time picker popup*/
        function _onTimeClick(scope, evt) {
            evt.stopPropagation();
            var TimeOpen = scope.isTimeOpen;
            $timeout(function () {
                WM.element(document).trigger('click');
                scope.isTimeOpen = !TimeOpen;
                scope.isDateOpen = false;
            });
        }

        /* this function returns date object. If val is undefined it returns invalid date */
        function parseDateTime(val) {
            /* check if the val is date object */
            if (WM.isDate(val)) {
                return val;
            }
            /*if the value is a timestamp string, convert it to a number*/
            if (!isNaN(val)) {
                val = parseInt(val, 10);
            }
            return new Date(val);
        }

        return {
            restrict: 'E',
            replace: true,
            scope: {},
            template: function (tElement, tAttrs) {
                var template = '',
                    isWidgetInsideCanvas,
                    target;

                if ($rs.isMobileApplicationType) {
                    template = WM.element(WidgetUtilService.getPreparedTemplate('template/device/widget/form/datetime.html', tElement, tAttrs));
                    return template[0].outerHTML;
                }

                template = WM.element($templateCache.get('template/widget/form/datetime.html', tElement, tAttrs));
                isWidgetInsideCanvas = tAttrs.hasOwnProperty('widgetid');
                target = template.children('input.form-control');

                /*Set name for the model-holder, to ease submitting a form*/
                template.find('.model-holder').attr('name', tAttrs.name);
                if (!isWidgetInsideCanvas) {
                    template.attr('data-ng-click', '_onClick($event)');
                    template.find('.btn-date').attr('data-ng-click', '_onDateClick($event)');
                    template.find('.display-input').attr('data-ng-click', '_onDateClick($event)');
                    template.find('.btn-time').attr('data-ng-click', '_onTimeClick($event)');

                    if (tAttrs.hasOwnProperty('onMouseenter')) {
                        template.attr('data-ng-mouseenter', 'onMouseenter({$event: $event, $scope: this})');
                    }

                    if (tAttrs.hasOwnProperty('onMouseleave')) {
                        template.attr('data-ng-mouseleave', 'onMouseleave({$event: $event, $scope: this})');
                    }

                    if (tAttrs.hasOwnProperty('onFocus')) {
                        target.attr('data-ng-focus', 'onFocus({$event: $event, $scope: this})');
                    }

                    if (tAttrs.hasOwnProperty('onBlur')) {
                        target.attr('data-ng-blur', 'onBlur({$event: $event, $scope: this})');
                    }
                }

                return template[0].outerHTML;
            },
            compile: function () {
                return {
                    pre: function (scope) {
                        scope.widgetProps = widgetProps;
                        if ($rs.isMobileApplicationType) {
                            scope._nativeMode = true;
                        }
                    },
                    post: function (scope, element, attrs) {
                        var onPropertyChange = propertyChangeHandler.bind(undefined, scope, element);
                        /* register the property change handler */
                        WidgetUtilService.registerPropertyChangeListener(onPropertyChange, scope, notifyFor);
                        WidgetUtilService.postWidgetCreate(scope, element, attrs);

                        scope.formatDateTime = _formatDateTime.bind(undefined, scope);
                        scope._onClick = _onClick.bind(undefined, scope);
                        scope._onDateClick = _onDateClick.bind(undefined, scope);
                        scope._onTimeClick = _onTimeClick.bind(undefined, scope);

                        /*
                         * Backward compatibility for ismeridian property which is deprecated.
                         * if ismeridian is false then time is set as 24hr clock format.
                         */
                        if (attrs.ismeridian === 'false' && !attrs.datepattern) {
                            scope.datepattern = scope.datepattern.replace('hh', 'HH').replace(' a', '');
                        }

                        /*On selection of a date, open the time picker popup*/
                        scope.selectDate = function (event) {
                            if (scope.isDateOpen) {
                                scope.isTimeOpen = true;
                            }
                            scope.formatDateTime();
                            scope._onChange({$event: event, $scope: scope});
                        };
                        scope.selectTime = function (event) {
                            scope.formatDateTime();
                            scope._onChange({$event: event, $scope: scope});
                        };
                        /* handle initial readonly/disabled values */
                        $timeout(function () {
                            onPropertyChange('disabled', scope.disabled);
                            onPropertyChange('readonly', scope.readonly);
                        });

                        /*update the model with device datetime value*/
                        scope.updateModel = function () {
                            scope._model_ = FormWidgetUtils.getUpdatedModel(scope.mindate, scope.maxdate, scope._model_, scope._proxyModel, scope._prevDateTime);
                            scope._prevDateTime = scope._model_;
                        };

                        /*Called from form reset when users clicks on form reset*/
                        scope.reset = function () {
                            //TODO implement custom reset logic here
                            scope._model_ = '';
                        };

                        /* _model_ acts as a converter for _proxyModel
                         * read operation of _model_/datavalue will return epoch format of the date
                         * write operation of _model_ will update _proxyModel with Date object.
                         *  */
                        Object.defineProperty(scope, '_model_', {
                            get: function () {
                                if (!scope._nativeMode) {
                                    return this._proxyModel;
                                }
                                var timestamp = this._proxyModel ?  this._proxyModel.valueOf() : undefined;
                                this.timestamp = timestamp;
                                if (this.outputformat === "timestamp") {
                                    return timestamp;
                                }
                                if (!this.outputformat) {
                                    this.outputformat = 'yyyy-MM-dd';
                                }
                                return this._proxyModel ? $filter('date')(this._proxyModel, this.outputformat) : undefined;
                            },
                            set: function (val) {
                                var dateTime;
                                if (scope._nativeMode) {
                                    if (val) {
                                        dateTime = parseDateTime(val);
                                        this._proxyModel = new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate(), dateTime.getHours(), dateTime.getMinutes(), dateTime.getSeconds());
                                        this.timestamp = this._proxyModel.getTime();
                                    } else {
                                        this._proxyModel = undefined;
                                    }
                                } else {
                                    dateTime = parseDateTime(val);
                                    if (dateTime.getTime()) {
                                        this._proxyModel = this._timeModel = dateTime.getTime();
                                        this._dateModel  = new Date(this._proxyModel);
                                    } else {
                                        this._proxyModel = this._dateModel = this._timeModel = undefined;
                                    }
                                    scope.formatDateTime();
                                }
                            }
                        });


                        scope.excludeDays = function (date) {
                            return _.includes(attrs.excludedays, date.getDay());
                        };

                        scope.excludeDates = function (date) {
                            return _.includes(scope.proxyExcludeDates, Date.parse(date));
                        };

                        /*Set the model if datavalue doesnt exists*/
                        if (!attrs.datavalue && !attrs.scopedatavalue) {
                            if (scope._nativeMode) {
                                scope._prevDateTime = scope._proxyModel = new Date();
                                scope.timestamp = scope._proxyModel.getTime();
                            } else {
                                scope._model_ = Date.now();
                            }
                        }

                        /*Set the model if datavalue exists*/
                        if (attrs.datavalue) {
                            scope._model_ = attrs.datavalue;
                            if (scope._nativeMode) {
                                scope._proxyModel = new Date(attrs.datavalue);
                            }
                        }
                    }
                };
            }
        };

    }]);


/**
 * @ngdoc directive
 * @name wm.widgets.form.directive:wmDatetime
 * @restrict E
 *
 * @description
 * The directive defines a date time  widget.
 *
 * @scope
 *
 * @requires PropertiesFactory
 * @requires WidgetUtilService
 * @requires $timeout
 *
 * @param {string=} name
 *                  Name of the time widget.
 * @param {string=} placeholder
 *                  Placeholder for the input field
 * @param {string=} hint
 *                  Title/hint for the time widget <br>
 *                  This property is bindable.
 * @param {number=} tabindex
 *                  This property specifies the tab order of time widget. <br>
 *                  Default value : 0
 * @param {string=} scopedatavalue
 *                  This property accepts the value for the  widget from a variable defined in the script workspace. <br>
 * @param {string=} datavalue
 *                  This property defines the value of the time widget. <br>
 *                  This property is bindable
 * @param {string=} timestamp
 *                  This property returns the unix timestamp (epoch) of the datavalue. <br>
 *                  This property can be used for intermediate calculations and validations. <br>
 * @param {string=} ismeridian
 *                  whether do display 12H or 24H. <br>
 * @param {string=} hourstep
 *                  Number of hours to increase or decrease
 * @param {string=} minutestep
 *                  Number of minutes to increase or decrease.
 * @param {string=} datepattern
 *                  display pattern of the date. <br>
 *                  This property is bindable. <br>
 *                  Default value : 'dd-MM-yyyy'
 * @param {string=} outputformat
 *                  output format of the widget. <br>
 *                  Default value : 'timestamp'
 * @param {string=} mindate
 *                  MinDate is the minimum date to start with. <br>
 *                  The default input pattern is mm/dd/yyyy
 * @param {string=} maxdate
 *                  MaxDate is the maximum date to end with. <br>
 *                  The default input pattern is mm/dd/yyyy
 * @param {string=} excludedays
 *                  Days which are to be excluded.<br>
 *                  Hint : sunday-0, saturday-6.
 * @param {string=} excludedates
 *                  Dates which are to be excluded.<br>
 *                  Hint : 'YYYY-MM-DD'.
 *@param {boolean=} required
 *                  required is a bindable property. <br>
 *                  if the required property is set to true, `required` class is applied to the label[an asterik will be displayed next to the content of the label']. <br>
 *                  Default value: `false`.
 * @param {boolean=} autofocus
 *                   This property makes the widget get focused automatically when the page loads.
 * @param {boolean=} showweeks
 *                   When set, week number will be displayed in date-picker UI.<br>
 *                   Default value: `false`
 * @param {boolean=} readonly
 *                   Readonly is a bindable property. <br>
 *                   This property will be used to make the time widget readonly on the web page. <br>
 *                   Default value: `false`. <br>
 * @param {boolean=} show
 *                  Show is a bindable property. <br>
 *                  This property will be used to show/hide the widget on the web page. <br>
 *                  Default value: `true`.
 * @param {boolean=} disabled
 *                  Disabled is a bindable property. <br>
 *                  This property will be used to disable/enable the widget on the web page. <br>
 *                  Default value: `false`.
 * @param {string=} on-change
 *                  Callback function which will be triggered when the widget value is changed.
 * @param {string=} on-focus
 *                  Callback function which will be triggered when the widget gets focused.
 * @param {string=} on-blur
 *                  Callback function which will be triggered when the widget loses focus.
 * @param {string=} on-click
 *                  Callback function which will be triggered when the widget is clicked.
 * @param {string=} on-mouseenter
 *                  Callback function which will be triggered when the mouse enters the widget.
 * @param {string=} on-mouseleave
 *                  Callback function which will be triggered when the mouse leaves the widget.
 * @example
 *   <example module="wmCore">
 *       <file name="index.html">
 *           <div data-ng-controller="Ctrl" class="wm-app">
 *               <wm-datetime
 *                  on-change="f($event, $scope)"
 *                  name="time1"
 *                  placeholder="set the time"
 *                  hourstep="{{hourstep}}"
 *                  minutestep="{{minutestep}}"
 *                  ismeridian="{{ismeridian}}"
 *                  datepattern="{{datepattern}}"
 *                  outputformat="{{outputformat}}"
 *                  mindate="{{mindate}}"
 *                  maxdate="{{maxdate}}"
 *                  excludedays="{{excludedays}}"
 *                  excludedates="{{excludedates}}">
 *               </wm-datetime><br>
 *
 *               <div>Selected Time: {{currentTime}}</div><br>
 *               <div>timestamp: {{currentTimestamp}}</div><br>
 *               <wm-composite>
 *                   <wm-label caption="datepattern:"></wm-label>
 *                   <wm-text scopedatavalue="datepattern"></wm-text>
 *               </wm-composite>
 *               <wm-composite>
 *                   <wm-label caption="output format:"></wm-label>
 *                   <wm-text scopedatavalue="outputformat"></wm-text>
 *               </wm-composite>
 *               <wm-composite>
 *                   <wm-label caption="mindate:"></wm-label>
 *                   <wm-text scopedatavalue="mindate"></wm-text>
 *               </wm-composite>
 *               <wm-composite>
 *                   <wm-label caption="maxdate:"></wm-label>
 *                   <wm-text scopedatavalue="maxdate"></wm-text>
 *               </wm-composite>
 *                <wm-composite>
 *                   <wm-label caption="excludedates:"></wm-label>
 *                   <wm-text scopedatavalue="excludedates"></wm-text>
 *               </wm-composite>
 *                <wm-composite>
 *                   <wm-label caption="excludedays:"></wm-label>
 *                   <wm-text scopedatavalue="excludedays"></wm-text>
 *               </wm-composite>
 *               <wm-composite>
 *                   <wm-label caption="ismeridian :"></wm-label>
 *                   <wm-text scopedatavalue="ismeridian"></wm-text>
 *               </wm-composite>
 *               <wm-composite>
 *                   <wm-label caption="hourstep:"></wm-label>
 *                   <wm-text scopedatavalue="hourstep"></wm-text>
 *               </wm-composite>
 *               <wm-composite>
 *                   <wm-label caption="minutestep:"></wm-label>
 *                   <wm-text scopedatavalue="minutestep"></wm-text>
 *               </wm-composite>
 *
 *           </div>
 *       </file>
 *       <file name="script.js">
 *          function Ctrl($scope) {
 *              $scope.ismeridian="true"
 *              $scope.hourstep="2"
 *              $scope.minutestep="4"
*               $scope.datepattern="dd-MM-yy hh:mm a"
 *              $scope.outputformat = "yyyy, dd MMMM hh:mm a"
 *              $scope.mindate="01-01-2015"
 *              $scope.maxdate="01-01-2020"
 *              $scope.excludedates="2015-05-18, 2015-10-27"
 *              $scope.excludedays="0,6"
 *              $scope.f = function (event,scope) {
 *                  $scope.currentTime = scope.datavalue;
 *                  $scope.currentTimestamp = scope.timestamp;
 *              }
 *           }
 *       </file>
 *   </example>
 */

