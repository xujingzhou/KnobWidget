
import './knob.scss';

import CanvasDigitalGauge from './../CanvasDigitalGauge';
import tinycolor from 'tinycolor2';

import { isNumber } from '../widget-utils';

/* eslint-disable import/no-unresolved, import/default */

import knobTemplate from './knob.tpl.html';

/* eslint-enable import/no-unresolved, import/default */

export default angular.module('thingsboard.widgets.rpc.knob', [])
    .directive('tbKnob', Knob)
    .name;

/*@ngInject*/
function Knob() {
    return {
        restrict: "E",
        scope: true,
        bindToController: {
            ctx: '='
        },
        controller: KnobController,
        controllerAs: 'vm',
        templateUrl: knobTemplate
    };
}

/*@ngInject*/
function KnobController($element, $scope, $document, utils, types) {   // , $log) {

    // test by johnny xu,2019/11/7
//    $log.log("---------------------- this is a changed knob ----------------------------");
//    $log.log('-----------------------utils-----------------', utils);
//    $log.log('-----------------------types-----------------', types);

    let vm = this;
    vm.value = 0;
    vm.error = '';

    var knob = angular.element('.knob', $element),
        knobContainer = angular.element('#knob-container', $element),
        knobTopPointerContainer = knob.find('.top-pointer-container'),
        knobTopPointer = knob.find('.top-pointer'),
        knobValueContainer = knob.find('.value-container'),
        knobValue = knob.find('.knob-value'),
        knobErrorContainer = knob.find('.error-container'),
        knobError = knob.find('.knob-error'),
        knobTitleContainer = knob.find('.title-container'),
        knobTitle = knob.find('.knob-title'),
        knobMinmaxContainer = knob.find('.minmax-container'),
        minmaxLabel = knob.find('.minmax-label'),
        textMeasure = knob.find('#text-measure'),
        startDeg = -1,
        currentDeg = 0,
        rotation = 0,
        lastDeg = 0,
        moving = false;

    var minDeg = -45;
    var maxDeg = 225;

    var canvasBarElement = angular.element('#canvasBar', $element);

    var levelColors = ['#19ff4b', '#ffff19', '#ff3232'];

    var canvasBar;

    // Added by Johnny Xu,2019/11/6
    vm.valueSubscription = null;

    $scope.$watch('vm.ctx', () => {
        if (vm.ctx) {
            init();
        }
    });

     // Added by Johnny Xu,2019/11/6
     $scope.$on('$destroy', () => {
         if (vm.valueSubscription) {
             vm.ctx.subscriptionApi.removeSubscription(vm.valueSubscription.id);
         }
     });

    function init() {

        vm.minValue = angular.isDefined(vm.ctx.settings.minValue) ? vm.ctx.settings.minValue : 0;
        vm.maxValue = angular.isDefined(vm.ctx.settings.maxValue) ? vm.ctx.settings.maxValue : 100;
        vm.title = angular.isDefined(vm.ctx.settings.title) ? vm.ctx.settings.title : '';

        var canvasBarData = {
            renderTo: canvasBarElement[0],
            hideValue: true,
            neonGlowBrightness: 0,
            gaugeWidthScale: 0.4,
            gaugeColor: 'rgba(0, 0, 0, 0)',
            levelColors: levelColors,
            minValue: vm.minValue,
            maxValue: vm.maxValue,
            gaugeType: 'donut',
            dashThickness: 2,
            donutStartAngle: 3/4*Math.PI,
            donutEndAngle: 9/4*Math.PI,
            animation: false
        };

        canvasBar = new CanvasDigitalGauge(canvasBarData).draw();

        knob.on('click', (e) => {
            if (moving) {
                moving = false;
                return false;
            }
            e.preventDefault();

            var offset = knob.offset();
            var center = {
                y : offset.top + knob.height()/2,
                x: offset.left + knob.width()/2
            };
            var a, b, deg,
                rad2deg = 180/Math.PI;

            e = (e.originalEvent.touches) ? e.originalEvent.touches[0] : e;

            a = center.y - e.pageY;
            b = center.x - e.pageX;
            deg = Math.atan2(a,b)*rad2deg;
            if(deg < 0){
                deg = 360 + deg;
            }
            if (deg > maxDeg) {
                if (deg - 360 > minDeg) {
                    deg = deg - 360;
                } else {
                    return false;
                }
            }

            currentDeg = deg;
            lastDeg = deg;
            knobTopPointerContainer.css('transform','rotate('+(currentDeg)+'deg)');
            turn(degreeToRatio(currentDeg));

            rotation = currentDeg;
            startDeg = -1;
        });

        knob.on('mousedown touchstart', (e) => {
            e.preventDefault();
            var offset = knob.offset();
            var center = {
                y : offset.top + knob.height()/2,
                x: offset.left + knob.width()/2
            };

            var a, b, deg, tmp,
                rad2deg = 180/Math.PI;

            knob.on('mousemove.rem touchmove.rem', (e) => {
                moving = true;
                e = (e.originalEvent.touches) ? e.originalEvent.touches[0] : e;

                a = center.y - e.pageY;
                b = center.x - e.pageX;
                deg = Math.atan2(a,b)*rad2deg;
                if(deg < 0){
                    deg = 360 + deg;
                }

                if(startDeg == -1){
                    startDeg = deg;
                }

                tmp = Math.floor((deg-startDeg) + rotation);

                if(tmp < 0){
                    tmp = 360 + tmp;
                }
                else if(tmp > 359){
                    tmp = tmp % 360;
                }

                if (tmp > maxDeg) {
                    if (tmp - 360 > minDeg) {
                        tmp = tmp - 360;
                    } else {
                        var deltaMax = Math.abs(maxDeg - lastDeg);
                        var deltaMin = Math.abs(minDeg - lastDeg);
                        if (deltaMax < deltaMin) {
                            tmp = maxDeg;
                        } else {
                            tmp = minDeg;
                        }
                    }
                }
                if(Math.abs(tmp - lastDeg) > 180){
                    startDeg = deg;
                    rotation = currentDeg;
                    return false;
                }

                currentDeg = tmp;
                lastDeg = tmp;

                knobTopPointerContainer.css('transform','rotate('+(currentDeg)+'deg)');

                // Modified by Johnny Xu, 2019/11/7
                turnMove(degreeToRatio(currentDeg));
            });

            $document.on('mouseup.rem  touchend.rem',() => {

                 // Added by Johnny Xu,2019/11/7
                 if (moving == true) {
//                   turnMove(degreeToRatio(currentDeg));
                     sendValue(degreeToRatio(currentDeg));
                 }

                knob.off('.rem');
                $document.off('.rem');
                rotation = currentDeg;
                startDeg = -1;
            });

        });

        vm.ctx.resize = resize;
        resize();

        var initialValue = angular.isDefined(vm.ctx.settings.initialValue) ? vm.ctx.settings.initialValue : vm.minValue;
        setValue(initialValue);

        var subscription = vm.ctx.defaultSubscription;
        var rpcEnabled = subscription.rpcEnabled;

        vm.isSimulated = $scope.widgetEditMode;

        vm.requestTimeout = 500;
        if (vm.ctx.settings.requestTimeout) {
            vm.requestTimeout = vm.ctx.settings.requestTimeout;
        }

        ///////////////////////////////////////////////////////////////////////
        // Added by Johnny XU,2019/11/6
         vm.retrieveValueMethod = 'rpc';
         if (vm.ctx.settings.retrieveValueMethod && vm.ctx.settings.retrieveValueMethod.length) {
              vm.retrieveValueMethod = vm.ctx.settings.retrieveValueMethod;
          }

         vm.valueKey = 'value';
         if (vm.ctx.settings.valueKey && vm.ctx.settings.valueKey.length) {
               vm.valueKey = vm.ctx.settings.valueKey;
         }

         vm.parseValueFunction = (data) => data;
         if (vm.ctx.settings.parseValueFunction && vm.ctx.settings.parseValueFunction.length) {
              try {
                    vm.parseValueFunction = new Function('data', vm.ctx.settings.parseValueFunction);
                 } catch (e) {
                     vm.parseValueFunction = (data) => data;
               }
         }

         vm.convertValueFunction = (value) => value;
         if (vm.ctx.settings.convertValueFunction && vm.ctx.settings.convertValueFunction.length) {
               try {
                   vm.convertValueFunction = new Function('value', vm.ctx.settings.convertValueFunction);
               } catch (e) {
                   vm.convertValueFunction = (value) => value;
               }
          }
          ///////////////////////////////////////////////////////////////////////

        vm.getValueMethod = 'getValue';
        if (vm.ctx.settings.getValueMethod && vm.ctx.settings.getValueMethod.length) {
            vm.getValueMethod = vm.ctx.settings.getValueMethod;
        }

        vm.setValueMethod = 'setValue';
        if (vm.ctx.settings.setValueMethod && vm.ctx.settings.setValueMethod.length) {
            vm.setValueMethod = vm.ctx.settings.setValueMethod;
        }

        if (!rpcEnabled) {
            onError('Target device is not set!');
        } else {
            if (!vm.isSimulated) {
                //////////////////////////////////////
                // Modified by Johnny Xu,2019/11/6
                if (vm.retrieveValueMethod == 'rpc') {
                      rpcRequestValue();
                } else if (vm.retrieveValueMethod == 'attribute' || vm.retrieveValueMethod == 'timeseries') {
                      subscribeForValue();
                }
               // rpcRequestValue();
               //////////////////////////////////////
            }
        }
    }

    function ratioToDegree(ratio) {
        return minDeg + ratio*(maxDeg-minDeg);
    }

    function degreeToRatio(degree) {
        return (degree-minDeg)/(maxDeg-minDeg);
    }

    function resize() {
        var width = knobContainer.width();
        var height = knobContainer.height();
        var size = Math.min(width, height);
        knob.css({width: size, height: size});
        canvasBar.update({width: size, height: size});
        setFontSize(knobTitle, vm.title, knobTitleContainer.height(), knobTitleContainer.width());
        setFontSize(knobError, vm.error, knobErrorContainer.height(), knobErrorContainer.width());
        var minmaxHeight = knobMinmaxContainer.height();
        minmaxLabel.css({'fontSize': minmaxHeight+'px', 'lineHeight': minmaxHeight+'px'});
        checkValueSize();
    }

    function turn(ratio) {
        var value = (vm.minValue + (vm.maxValue - vm.minValue)*ratio).toFixed(vm.ctx.decimals);
        if (canvasBar.value != value) {
            canvasBar.value = value;
        }

        updateColor(canvasBar.getValueColor());
        onValue(value);

        // test by johnny xu,2019/11/7
//        $log.log("--------------turn(ratio)---------------");
//        $log.log("-------------value = ", value);
    }

    function turnMove(ratio) {
        var value = (vm.minValue + (vm.maxValue - vm.minValue)*ratio).toFixed(vm.ctx.decimals);
        if (canvasBar.value != value) {
            canvasBar.value = value;
        }

        updateColor(canvasBar.getValueColor());

        // Added by Johnny Xu,2019/11/7
        $scope.$applyAsync(() => {
            vm.value = formatValue(value);
            checkValueSize();
        });

        // test by johnny xu,2019/11/7
//        $log.log("--------------turnMove(ratio)---------------");
//        $log.log("-------------value = ", value);
    }

    // Added by Johnny Xu, 2019/11/7
    function sendValue(ratio) {
        var value = (vm.minValue + (vm.maxValue - vm.minValue)*ratio).toFixed(vm.ctx.decimals);
        onValue(value);

         // test by johnny xu,2019/11/7
//        $log.log("--------------sendValue(ratio)---------------");
//        $log.log("-------------value = ", value);
    }

    ////////////////////////////////////////////////////////////////////
    // Added by Johnny Xu,2019/11/6
    function subscribeForValue() {
        var valueSubscriptionInfo = [{
            type: types.datasourceType.entity,
            entityType: types.entityType.device,
            entityId: vm.ctx.defaultSubscription.targetDeviceId
        }];

        if (vm.retrieveValueMethod == 'attribute') {
            valueSubscriptionInfo[0].attributes = [
                {name: vm.valueKey}
            ];
        } else {
            valueSubscriptionInfo[0].timeseries = [
                {name: vm.valueKey}
            ];
        }

        var subscriptionOptions = {
            callbacks: {
                onDataUpdated: onDataUpdated,
                onDataUpdateError: onDataUpdateError
            }
        };

        vm.ctx.subscriptionApi.createSubscriptionFromInfo (
            types.widgetType.latest.value, valueSubscriptionInfo, subscriptionOptions, false, true).then(
            (subscription) => {
                vm.valueSubscription = subscription;
            }
        );
    }

    function onDataUpdated(subscription, apply) {
        var value = 0;
        var data = subscription.data;
        if (data.length) {
            var keyData = data[0];
            if (keyData && keyData.data && keyData.data[0]) {
                var attrValue = keyData.data[0][1];
                if (attrValue) {
                    var parsed = null;
                    try {
                        parsed = vm.parseValueFunction(angular.fromJson(attrValue));
                    } catch (e){/**/}

                    // Modified by Johnny Xu,2019/11/6
                    value = formatValue(parsed);
                }
            }
        }

        // Avoid slop over. modified by Johnny Xu,2019/11/7
        if (angular.isDefined(vm.ctx.settings.minValue)) {
            if (vm.ctx.settings.minValue > value) {
               value = vm.ctx.settings.minValue;
            }
        }
        if (angular.isDefined(vm.ctx.settings.maxValue)) {
            if (vm.ctx.settings.maxValue < value) {
                value = vm.ctx.settings.maxValue;
            }
        }
        setValue(value);

        if (apply) {
            $scope.$digest();
        }
    }

    function onDataUpdateError(subscription, e) {
        var exceptionData = utils.parseException(e);
        var errorText = exceptionData.name;
        if (exceptionData.message) {
            errorText += ': ' + exceptionData.message;
        }
        onError(errorText);
    }
    ////////////////////////////////////////////////////////////////////

    function setValue(value) {
        var ratio = (value-vm.minValue) / (vm.maxValue - vm.minValue);
        rotation = lastDeg = currentDeg = ratioToDegree(ratio);
        knobTopPointerContainer.css('transform','rotate('+(currentDeg)+'deg)');
        if (canvasBar.value != value) {
            canvasBar.value = value;
        }
        updateColor(canvasBar.getValueColor());

        vm.value = formatValue(value);
        checkValueSize();
    }

    function updateColor(color) {
        var glowColor = tinycolor(color).brighten(30).toHexString();
        knobValue.css({'color': glowColor});
        var textShadow = `${color} 1px 1px 10px, ${glowColor} 1px 1px 10px`;
        knobValue.css({'textShadow': textShadow});
        knobTopPointer.css({'backgroundColor': glowColor});
        var boxShadow = `inset 1px 0 2px #040404, 1px 1px 8px 2px ${glowColor}`;
        knobTopPointer.css({'boxShadow': boxShadow});
    }

    function onValue(value) {
        $scope.$applyAsync(() => {
            vm.value = formatValue(value);
            checkValueSize();
            rpcUpdateValue(value);
        });
    }

    function onError(error) {
        $scope.$applyAsync(() => {
            vm.error = error;
            setFontSize(knobError, vm.error, knobErrorContainer.height(), knobErrorContainer.width());
        });
    }

    function formatValue(value) {
        return vm.ctx.utils.formatValue(value, vm.ctx.decimals, vm.ctx.units, true);
    }

    function checkValueSize() {
        var fontSize = knobValueContainer.height()/3.3;
        var containerWidth = knobValueContainer.width();
        setFontSize(knobValue, vm.value, fontSize, containerWidth);
    }

    function setFontSize(element, text, fontSize, maxWidth) {
        var textWidth = measureTextWidth(text, fontSize);
        while (textWidth > maxWidth) {
            fontSize--;
            textWidth = measureTextWidth(text, fontSize);

            // Fixed page crash issues. Modified by Johnny Xu,2019/11/5
            if(fontSize < 13) {
               break;
            }
        }
        element.css({'fontSize': fontSize+'px', 'lineHeight': fontSize+'px'});
    }

    function measureTextWidth(text, fontSize) {
        textMeasure.css({'fontSize': fontSize+'px', 'lineHeight': fontSize+'px'});
        textMeasure.text(text);
        return textMeasure.width();
    }

    // Read value while initializer
    function rpcRequestValue() {
        vm.error = '';
        vm.ctx.controlApi.sendTwoWayCommand(vm.getValueMethod, null, vm.requestTimeout).then(
            (responseBody) => {
                if (isNumber(responseBody)) {
                    var numValue = Number(responseBody).toFixed(vm.ctx.decimals);
                    ///////////////////////////////////
                    // Modified by Johnny Xu,2019/11/6
                    setValue(vm.parseValueFunction(numValue));
                    // setValue(numValue);
                    ///////////////////////////////////
                } else {
                    var errorText = `Unable to parse response: ${responseBody}`;
                    onError(errorText);
                }
            },
            () => {
                var errorText = vm.ctx.defaultSubscription.rpcErrorText;
                onError(errorText);
            }
        );
    }

    // Write Value while value is changed
    function rpcUpdateValue(value) {
        // test by johnny xu,2019/11/7
//        $log.log("--------------rpcUpdateValue(value)---------------");
//        $log.log("--------------value = ", value);

        if (vm.executingUpdateValue) {
            vm.scheduledValue = value;
            return;
        } else {
            vm.scheduledValue = null;
            vm.rpcValue = value;
            vm.executingUpdateValue = true;
        }

        vm.error = '';
        //////////////////////////////////////////
        // Modified by Johnny Xu,2019/11/6
        // vm.ctx.controlApi.sendOneWayCommand(vm.setValueMethod, value, vm.requestTimeout).then(
        vm.ctx.controlApi.sendOneWayCommand(vm.setValueMethod, vm.convertValueFunction(value), vm.requestTimeout).then(
        //////////////////////////////////////////
            () => {
                vm.executingUpdateValue = false;
                if (vm.scheduledValue != null && vm.scheduledValue != vm.rpcValue) {
                    rpcUpdateValue(vm.scheduledValue);
                }
            },
            () => {
                vm.executingUpdateValue = false;
                var errorText = vm.ctx.defaultSubscription.rpcErrorText;
                onError(errorText);
            }
        );
    }
}