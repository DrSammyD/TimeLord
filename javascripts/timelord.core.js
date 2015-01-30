
(function(a) {
    ('function' == typeof(define) && define.amd) ? define(a): 'object' == typeof exports ? module.exports = a : a();
})(function() {
    var tlc = {};
    //polyfill
    if(!Array.prototype.forEach){Array.prototype.forEach=function(e,t){var n,r;if(this==null){throw new TypeError(" this is null or not defined")}var i=Object(this);var s=i.length>>>0;if(typeof e!=="function"){throw new TypeError(e+" is not a function")}if(arguments.length>1){n=t}r=0;while(r<s){var o;if(r in i){o=i[r];e.call(n,o,r,i)}r++}}}["Arguments","Function","String","Number","Date","RegExp"].forEach(function(e){tlc["is"+e]=function(t){return toString.call(t)=="[object "+e+"]"}})
    //
    var setupOptions = function(options, optionKeys, optionConstructors, optionOrderer, cyclicDependencyStack, completed) {
        optionKeys.forEach(function(prop, index) {
            if (!~completed.indexOf(prop)) {
                if (optionOrderer[prop].length) {
                    if (~cyclicDependencyStack.indexOf(prop))
                        throw Error("Cannot combine the following options, because they have a cyclic dependency: " + cyclicDependencyStack.join(", "));
                    else
                        cyclicDependencyStack.push(prop);
                    setupOptions(options, optionKeys, optionConstructors, optionOrderer, cyclicDependencyStack,completed);
                }
                optionConstructors[prop].apply(that, val);
                completed.push(prop);
            }
        });
        cyclicDependencyStack.length--;
    };
    var model = function(options) {
        var that = this;
        that.actions = {};
        that.responses = {};
        that.preResponses = {};
        that.silos = {};
        that.actionToSilo = {};
        var optionKeys = [];
        for (var prop in options) {
            optionKeys.push(prop);
        }
        setupOptions.call(that, options, optionKeys, model.optionConstructors, model.optionOrderer, [], []);
    };
    model.optionConstructors = {};
    model.optionOrderer = {};
    var proto = model.prototype;
    proto.registerAction = function(actionName, action, silos) {
        var that = this;
        if (tlc.isString(silos))
            silos = [silos];
        if (tlc.isArray(silos) && tlc.isFunction(action)) {
            that.actions[actionName] = action || that.actions[actionName];
            var ats = that.actionToSilo[actionName];
            ats = (that.actionToSilo[actionName] = ats || []);
            silos.foreach(function(siloName) {
                if (tlc.isString(siloName) && ~!ats.indexOf(siloName)) {
                    that.silos[siloName] = that.silos[siloName] || [];
                    ats.push(siloName);
                }
            });
        }
    };
    proto.registerResponse = function(siloName, response, responseName) {
        var that = this;
        var obj = (that.responses[siloName] = that.responses[siloName] || {});
        obj[responseName]=response;
    };
    proto.registerPrepreresponse = function(siloName, preresponse, preresponseName) {
        var that = this;
        var obj = (that.preresponses[siloName] = that.preresponses[siloName] || {});
        obj[preresponseName]=preresponse;
    };
    proto.getTrigger = function(actionName, silos) {
        var that = this,
            action = that.actions[actionName];
        if (!silos) {
            return function() {
                var args = arguments;
                that.actionToSilo[actionName].forEach(function(silo) {
                    that.preresponses[silo].foreach(function(preresponse) {
                        preresponse.apply(that, [that.silo[silos]]);
                    });
                    action.apply(that, [that.silos[silo]].concat(Array.prototype.slice.apply(args, [0])));
                    that.responses[silo].foreach(function(response) {
                        response.apply(that, [that.silo[silos]]);
                    });
                });
            };
        }
        return function() {
            var args = arguments;
            that.silos.forEach(function(silo) {
                that.preresponses[silo].foreach(function(preresponse) {
                    preresponse.apply(that, [that.silo[silos]]);
                });
                action.apply(that, [that.silos[silo]].concat(Array.prototype.slice.apply(args, [0])));
                that.responses[silo].foreach(function(response) {
                    response.apply(that, [that.silo[silos]]);
                });
            });
        };
    };
    model.registerOption = function(optionName, optionFunc, after) {
        model.optionConstructors[optionName] = optionFunc;
        model.optionOrderer[optionName] = after;
    };
});