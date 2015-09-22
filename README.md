## Analytics AMD Module.

An AMD module that provides a simple mechanism for automatically attaching Universal GA events to markup.

### Markup.

To automatically wire-up GA events you simply add a selection of data attributes to the element you are interested in.

```html
    <span data-ga-event="click" data-ga-category="[Category name]" data-ga-label="[Label name]" data-ga-action="[Action name]" data-ga-value>
        Some content...
    </span>
```

The following data attributes are available:
* **data-ga-event {string}** required.

    The event to track, any of the standard event types: click, mousedown, mouseup, etc.
* **data-ga-category {string}** required.

    The category of event, any string you like to help you group your events.
* **data-ga-label {string}** optional.

    A label that you can attach to the event.
* **data-ga-action {string}** optional.

    A description of the action to attach to the event.
* **data-ga-value {integer}** optional.

    An integer value.
* **data-ga-interactive {boolean} [nonInteractive=false]** optional.

    Is the event an interactive event? The default is nonInteractive=false which indicates an interactive event.

### Including the module with require.

You can simply use RequireJS to include the module.

```javascript
    define(['analytics'], function(analytics) {

        var view = Backbone.View.extend({

            // You can create a view variable to hold the analytics object.
            var analyticsModule = analytics();

            // Or you can call a new instance everytime.
            analytics().[method];

        });

        return view;
    });
```

### Initialising the module.

The following method will scan the DOM starting at the specified element and automatically attach the relevant event handlers.

```javascript
    function attachEventHandlers(element, captureAtRoot, customCallbacks, allowFollowHrefs, enableDebugMode)
```

The following parameters are available:
* **element {JQuery object}** required.

    The element that is the root of your view.
* **captureAtRoot {boolean} [captureAtRoot=false]** optional.

    If an element does not have a ga-event data attribute the event can be captured at the root element.
* **customCallbacks {object|null} [customCallbacks=null]** optional unless any of the succeeding parameters are used.

    An object that contain any combination of the two available callbacks.
    ```javascript
        {
            // Triggered before any events are sent, return false to prevent any further events from firing.
            'before': function(event) {
                ...
                return [true|false];
            },
            // Triggered after all events have been sent.
            'after': function(event) {}
        }
    ```
* **allowFollowHrefs {boolean} [allowFollowHrefs=true]** optional.

    If you attach an event handler to an <a href="[url]" /a> the system can prevent the hyperlink from being followed, you are then given the option to handle it yourself.
* **enableDebugMode {boolean} [enableDebugMode=false]** optional.

### Manually firing single GA events.

Single GA events can be triggered using the following method.

```javascript
    function trackEvent(event, category, action, label, value, interactive)
```
The above method will return a promise allowing you to execute code at anytime once the event sending process is complete.

```javascript
    // Send a GA event.
    analytics().trackEvent(
        event,
        'My category',
        'My action',
        'My label',
        '123',
        false
    ).done(function (result) {
        // Event sent to GA.
        ...
    });
```

The following parameters are available:
* **event {JQuery event object|null}** required.

    The event that triggered this action (if for example you were within an event handler). NULL can be specified if no event object is available.
* **category {string}** required.

    The category of event, any string you like to help you group your events.
* **action {string}** optional.

    A description of the action to attach to the event.
* **label {string}** optional.

    A label that you can attach to the event.
* **value {integer}** optional.

    An integer value.
* **interactive {boolean} [interactive=true]** optional.

    Is the event an interactive event? The default is nonInteractive=false which indicates an interactive event.

### Manually firing multiple GA events.

Events can be queued allowing multiple events to be handled within the same promise.

```javascript
    // Queue a GA event.
    analytics().queueEvent({
        'eventCategory': 'My category',
        'eventAction': 'My action',
        'eventLabel': 'My label',
        'eventValue': '123',
        'nonInteraction': false
    });

    // Tracking an event with also send all queued events.
    analytics().trackEvent(
        event,
        'My category',
        'My action',
        'My label',
        '123',
        false
    ).done(function (result) {
        // All events sent to GA, including those in the queue.
        ...
    });

```