/**
 * Google Analytics module.
 */
define(function()
{
    var analytics = (function() {

        /**
         * Is universal analytics available.
         *
         * @type {boolean}
         */
        var gaAvailable = true;


        /**
         * Allow all events of type(s) to be bubbled to, and captured by the root element.
         *
         * @type {boolean}
         */
        var captureEventAtRoot = false;


        /**
         * The Backbone root element, usually $el.
         *
         * @type {object}
         */
        var viewRootElement;


        /**
         * Is debug mode enabled.
         * If debug mode is enabled, all event details will be logged to the console.
         *
         * @type {boolean}
         */
        var debugMode = false;


        /**
         * Default options for GA event.
         *
         * @type {object}
         */
        var defaultEventOptions = {
            'hitType': 'event',
            'eventCategory': '',
            'eventAction': '',
            'nonInteraction': false
        };


        /**
         * Events queue.
         * The new method queueEvent can be used to add events to the queue.
         * Multiple GA events can be triggered from a single DOM event.
         *
         * @type {Array}
         */
        var eventQueue = [];


        /**
         * This optional callback is called before the ga tracking is sent.
         * If the callback returns false the tracking data will not be sent.
         *
         * @type {function}
         */
        var beforeTrackCallback;


        /**
         * This optional callback is called after the ga tracking is sent.
         * If the callback returns false the tracking data was not sent.
         *
         * @type {function}
         */
        var afterTrackCallback;


        /**
         * If a click is a hyperlink do we want to follow it to its destination?
         *
         * @type {boolean}
         */
        var followHrefs = true;


        /**
         * Handle a specific element event.
         *  data-ga-event attached to element.
         *
         * @param {string} gaEventType The type of event triggered.
         * @param {object} gaElement The element the event was triggered from.
         * @param {string} gaElementType The type of element.
         * @param {object} gaEventOptions Default event options.
         * @returns {object} Event options.
         */
        function handleElementEvent(gaEventType, gaElement, gaElementType, gaEventOptions) {
            // Create a copy of the default options object.
            var gaOptions = $.extend({}, gaEventOptions);

            // Did we get an event category?
            gaOptions.eventCategory = (gaElement.data('ga-category') !== undefined)
                ? gaElement.data('ga-category')
                : gaElementType;

            // Did we get an event action?
            gaOptions.eventAction = (gaElement.data('ga-action') !== undefined)
                ? gaElement.data('ga-action')
                : gaEventType;

            // Optional param label?
            if (gaElement.data('ga-label') !== undefined) {
                gaOptions.eventLabel = gaElement.data('ga-label');
            }

            // Optional param value?
            if (gaElement.data('ga-value') !== undefined && typeof gaElement.data('ga-value') === 'number') {
                gaOptions.eventValue = parseInt(gaElement.data('ga-value'));
            }

            // Optional param interactive?
            if (gaElement.data('ga-interactive') !== undefined && typeof gaElement.data('ga-interactive') === 'boolean') {
                gaOptions.nonInteraction = !gaElement.data('ga-interactive');
            }

            return gaOptions;
        }


        /**
         * Send the tracking event to google.
         * This can be prevented using the before callback.
         *
         * @param {object} event The triggered event.
         * @param {object} gaEventOptions Collection of event options.
         */
        function sendGAEvent(event, gaEventOptions) {
            var deferred = $.Deferred();

            if (gaAvailable === true && gaEventOptions.eventCategory != '' && gaEventOptions.eventAction != '') {
                $(gaEventOptions).each(function(index, options) {
                    var sendGATracking = true;

                    if (typeof beforeTrackCallback === 'function') {
                        // Call the callback, pass the event and the options object.
                        sendGATracking = beforeTrackCallback(event, options);
                    }

                    if (typeof ga === 'function' && sendGATracking === true) {

                        // Add callback to event options.
                        gaEventOptions.hitCallback = function() {

                            // Log to console if in debug mode and console function is available (IE9).
                            if (debugMode && window.console !== undefined) {
                                console.log('GA Event: ', gaEventOptions);
                            }

                            // Process any events in the queue.
                            if (eventQueue.length > 0) {
                                var queueItemProcessed = 0;

                                for (var eventIndex = 0; eventIndex < eventQueue.length; eventIndex++) {

                                    eventQueue[eventIndex].hitCallback = function() {
                                        // Log to console if in debug mode and console function is available (IE9).
                                        if (debugMode && window.console !== undefined) {
                                            console.log('Q GA Event: ', eventQueue[queueItemProcessed]);
                                        }

                                        queueItemProcessed++;

                                        if (queueItemProcessed === eventQueue.length) {
                                            eventQueue.length = 0;
                                            deferred.resolve(true);
                                        }
                                    };

                                    ga('send', eventQueue[eventIndex]);
                                }
                            } else {
                                deferred.resolve(true);
                            }

                        };

                        ga('send', gaEventOptions);

                    } else {
                        deferred.resolve(false);
                    }

                });
            } else {
                deferred.resolve(false);
            }

            return deferred.promise();
        }


        /**
         * Handle a generic event.
         *
         * @param {object} event The event that was triggered.
         */
        function handleEvent(event) {
            // GA available ?
            if (gaAvailable === true) {
                var gaEventType = event.type;
                var gaElement = $(event.currentTarget);
                var gaElementType = gaElement[0].tagName;
                var clickedTarget = $(event.target);

                // Event options, required fields.
                var gaEventDefaultOptions = $.extend({}, defaultEventOptions);
                var gaEventOptions = [];

                // Bubble up capture?
                if (captureEventAtRoot && gaElement.data('ga-event') === undefined) {

                    // Travel up through the ancestors until a ga-event is found.
                    gaElement.parents().each(
                        function (index, element) {
                            var parentElement = $(element);

                            // Has the element got a ga-event handler?
                            if ($(element).is(viewRootElement) === false && parentElement.data('ga-event') !== undefined && parentElement.data('ga-no-track') === undefined) {
                                parentElement.trigger(gaEventType);
                                return false;
                            } else if ($(element).is(viewRootElement)) {
                                return false;
                            }
                        }
                    );

                } else {
                    gaEventOptions = handleElementEvent(gaEventType, gaElement, gaElementType, gaEventDefaultOptions);
                }

                // Are we handling a click event on an a tag which has a href?
                // If so, we need to sort out a little race condition! The GA Event is not guaranteed to beat the
                // page redirection.
                var handleLocationRaceCondition = false;

                // Prevent any default actions.
                event.preventDefault();

                // If the element is <a> then check if should be followed.
                if (followHrefs === true && gaElement[0].tagName.toLowerCase() === 'a' && gaElement[0].target == '') {
                    handleLocationRaceCondition = true;
                }

                // Trigger event if valid
                sendGAEvent(event, gaEventOptions).done(function (gaTrackingSent) {
                    if (typeof afterTrackCallback === 'function') {
                        // Call the callback, pass the event and the flag that signified whether events sent.
                        afterTrackCallback(event, gaTrackingSent, gaEventOptions, eventQueue);
                    }

                    // Send the browser on its merry way.
                    if (handleLocationRaceCondition === true) {
                        window.location = gaElement[0].href;
                    }
                });
            }
        }


        /**
         * Attach custom form submit handlers.
         *
         * @param {object} element The element that will handle the event.
         * @param {object} event The event to handle.
         */
        function attachFormSubmitHandler(element, event) {
            switch (event) {
                case 'click':
                    handleFormPostClick(element);
                    break;
                case 'enter':
                    handleFormPostEnter(element);
                    break;
            }
        }


        /**
         * Handle the form submit.
         *
         * @param {object} form The form to submit.
         * @param {object} event The event that started everything, passed onto the before track callback (if defined).
         * @param {object} gaEventOptions The GA event options.
         */
        function submitForm(form, event, gaEventOptions) {
            // Check form is valid.
            var formValid = $(form)[0].checkValidity();

            if (formValid === false) {
                // Form has failed validation, configure event to reflect this.
                gaEventOptions.eventLabel = 'submission failed, form data is invalid'
            }

            // Trigger event if valid
            sendGAEvent(event, gaEventOptions);

            // Submit the form.
            if (formValid === true) {
                form.submit();
            }
        }


        /**
         * Automated form post using enter key.
         * This is accomplished using the event: formsubmit.enter on any input element.
         *
         * @param {object} element The element that will receive the enter key event.
         */
        function handleFormPostEnter(element) {
            $(element).on('keydown', function (event) {
                // Enter pressed?
                if (event.keyCode === 13) {
                    event.preventDefault();

                    // Find the closest form.
                    var form =  $(element).closest('form');
                    var gaEventDefaultOptions = $.extend({}, defaultEventOptions);

                    if (submitForm !== undefined ) {
                        // Configure the event.
                        var gaEventOptions = handleElementEvent('keydown', form, form[0].tagName, gaEventDefaultOptions);

                        // Attempt to submit the form.
                        submitForm(form, event, gaEventOptions);
                    }
                }
            });
        }


        /**
         * Automated form post using an element click.
         * This is accomplished using the event: formsubmit.click on any element.
         *
         * @param {object} element The element that will receive the click event.
         */
        function handleFormPostClick(element) {
            $(element).on('click', function (event) {
                // Find the closest form.
                var form =  $(element).closest('form');
                var gaEventDefaultOptions = $.extend({}, defaultEventOptions);

                if (submitForm !== undefined ) {
                    // Configure the event.
                    var gaEventOptions = handleElementEvent('click', $(element), $(element)[0].tagName, gaEventDefaultOptions);

                    // Attempt to submit the form.
                    submitForm(form, event, gaEventOptions);
                }
            });
        }


        /**
         * Attach GA events to all child elements of the specified element.
         *
         * @param {object} element The root element.
         * @param {boolean} captureAtRoot Capture all events at the root level (there must be a handler specified on the root).
         * @param {object} customCallbacks The before tracking callback.
         * @param {boolean} allowFollowHrefs If an event is attached to a hyperlink do you want to follow the link once the event has completed?
         * @param {boolean} enableDebugMode Enable console log event debugging.
         */
        function attachEventHandlers(element, captureAtRoot, customCallbacks, allowFollowHrefs, enableDebugMode) {
            // Only continue if GA universal analytics is loaded.
            if (typeof window.ga === 'function' && ga.create !== undefined) {
                // Follow HREFs?
                if (allowFollowHrefs !== undefined && typeof allowFollowHrefs === 'boolean') {
                    followHrefs = allowFollowHrefs;
                }

                // Activate debug mode?
                if (enableDebugMode !== undefined && typeof enableDebugMode === 'boolean') {
                    debugMode = enableDebugMode;
                }

                // Assign the Backbone root element.
                viewRootElement = element;

                // Find all elements with a GA event.
                var gaElements = element.find('[data-ga-event]');

                // Did we get any 'before/after event track' callbacks?
                if (customCallbacks !== undefined && typeof customCallbacks === 'object') {
                    // Before handler?
                    if (customCallbacks.before !== undefined && typeof customCallbacks.before === 'function') {
                        beforeTrackCallback = customCallbacks.before;
                    }

                    // After handler?
                    if (customCallbacks.after !== undefined && typeof customCallbacks.after === 'function') {
                        afterTrackCallback = customCallbacks.after;
                    }
                }

                // Capture all events at the root level?
                if (captureAtRoot !== undefined && typeof captureAtRoot === 'boolean') {
                    captureEventAtRoot = captureAtRoot;
                }

                // Attach all events within the specified root element.
                gaElements.each(function (idx, gaElement) {
                    var eventList = $(gaElement).data('ga-event').split(' ');

                    // We have to attach events individually, a custom event may exist in the list.
                    $(eventList).each(function (eventIdx, eventListName) {
                        var eventName = eventListName.split('.');

                        // Custom event?
                        if (eventName.length === 2) {
                            switch (eventName[0]) {
                                // Attach custom form submit handler.
                                case 'formsubmit':
                                    attachFormSubmitHandler(gaElement, eventName[1]);
                                    break;
                            }
                        } else {
                            $(gaElement).on($(gaElement).data('ga-event'), function (event) {
                                handleEvent(event);
                            });
                        }

                    });

                });

            } else {
                gaAvailable = false;
                throw 'Google universal analytics not loaded.';
            }
        }


        /**
         * Add a custom event to the event queue.
         *
         * @param {object} options Collection of event options.
         */
        function queueEvent(options) {
            var gaOptions = $.extend({}, defaultEventOptions, options);

            if (gaOptions.eventCategory !== '' && gaOptions.eventAction !== '') {
                eventQueue.push(gaOptions);
            } else {
                throw 'Event options could not be added to the queue: Category and Action are mandatory.';
            }
        }


        /**
         * Trigger a custom event track.
         *
         * @param {object} event The event.
         * @param {string} category The event tracking category.
         * @param {string} action The event tracking action.
         * @param {string|null} label The event tracking label.
         * @param {int|null} value The event tracking value.
         * @param {boolean|null} interactive Is the event classified as interactive?
         */
        function trackEvent(event, category, action, label, value, interactive) {
            var deferred = $.Deferred();
            var gaEventOptions = $.extend({}, defaultEventOptions);

            // Defaults.
            var gaEventType = '';
            var gaElement = {};
            var gaElementType = '';

            // We may not have an event.
            if (event !== null) {
                gaEventType = event.type;
                gaElement = $(event.target);
                gaElementType = gaElement[0].tagName;
            }

            // Did we get an event category?
            gaEventOptions.eventCategory = (category !== undefined)
                ? category
                : gaElementType;

            // Did we get an event action?
            gaEventOptions.eventAction = (action !== undefined)
                ? action
                : gaEventType;

            // Optional param label?
            if (label !== undefined) {
                gaEventOptions.eventLabel = label;
            }

            // Optional param value?
            if (value !== undefined && typeof value === 'number') {
                gaEventOptions.eventValue = parseInt(value);
            }

            // Optional non interaction setting?
            if (interactive !== undefined && typeof interactive === 'boolean') {
                gaEventOptions.nonInteraction = !interactive;
            }

            sendGAEvent(event, gaEventOptions).done(function(gaEventSent) {
                deferred.resolve(gaEventSent);
            });

            return deferred.promise();
        }


        /**
         * Public methods.
         */
        return {
            attachEventHandlers: attachEventHandlers,
            queueEvent: queueEvent,
            trackEvent: trackEvent
        };

    });

    return analytics;
});