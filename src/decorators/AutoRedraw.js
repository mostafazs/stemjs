import {GenericObjectStore, StoreObject} from "../state/Store";
import {PropertyCache} from "../data-structures/PropertyCache";

// TODO: maybe have better names
const autoRedrawListenersLazy = new PropertyCache("autoRedrawHandler", () => new Set());

// TODO merge with AsyncAggregateDispatcher implementation
function getQueueMicrotaskFunc() {
    if (self.queueMicrotask && (typeof self.queueMicrotask === "function")) {
        return self.queueMicrotask;
    }
    return (task) => setTimeout(task, 0);
}
export const queueMicrotaskWrapper = getQueueMicrotaskFunc();

// TODO put together with RunOnce
export class OncePerTickRunner {
    constructor(callback) {
        this.callback = callback;
        this.weakMap = new WeakMap();
    }

    maybeEnqueue(obj) {
        if (this.weakMap.has(obj)) {
            return false;
        }
        this.weakMap.set(obj, true);
        queueMicrotaskWrapper(() => {
            this.weakMap.delete(obj);
            this.callback(obj);
        });
        return true;
    }
}

export const redrawPerTickRunner = new OncePerTickRunner((obj) => obj.node && obj.redraw());

const redrawHandlerLazy = new PropertyCache("autoRedrawListener", (obj) => {
    return () => redrawPerTickRunner.maybeEnqueue(obj);
});

// Decorator that attaches an update listener on all store objects in options
// The logic is very crude, but works in most cases
export function autoredrawDecorator(Cls, ...args) {
    const listenersDefault = () => new Set([...args]);
    // TODO: we only need to do this once, throw an error if applying multiple times to the same class

    if (Cls.autoRedrawImplemented) {
        console.error("Can't use autoredraw on a class that inherited another class using autoredraw");
        return;
    }

    Cls.autoRedrawImplemented = true;
    const oldSetOptions = Cls.prototype.setOptions;
    // TODO: optimize to only attach after onMount
    Cls.prototype.setOptions = function setOptions(options) {
        oldSetOptions.call(this, options);

        let listenerTargetSet = autoRedrawListenersLazy.get(this, listenersDefault);

        const objArray = Object.values(options || {}).filter(obj => {
            return (obj instanceof StoreObject) && !listenerTargetSet.has(obj);
        });

        // TODO: we don't remove listeners here, just results in some extra redraws when reassigning options

        // Add the new extra ones, and attach the lister if mounted
        for (let obj of objArray) {
            // Technically we could just add these listeners, but this would also leave us with listeners on temp ui elements
            // TODO: probably need to remove at cleanup
            if (this.node) {
                this.attachUpdateListener(obj, redrawHandlerLazy.get(this));
            }

            listenerTargetSet.add(obj);
        }
    };

    const oldOnMount = Cls.prototype.onMount;
    Cls.prototype.onMount = function onMount() {
        oldOnMount.call(this);
        const listenerTargetSet = autoRedrawListenersLazy.get(this, listenersDefault);
        for (const obj of listenerTargetSet) {
            const redrawHandler = redrawHandlerLazy.get(this);
            this.attachUpdateListener(obj, redrawHandler);
            if (obj instanceof GenericObjectStore) {
                this.attachCreateListener(obj, redrawHandler);
                this.attachDeleteListener(obj, redrawHandler);
            }
        }
    };

    return Cls;
}

// Can be called decorated as @autoredraw or @autoredraw(Watch1, Watch2, ...)
export function autoredraw(...args) {
    if (args[0]?.prototype?.attachUpdateListener) {
        return autoredrawDecorator(args[0]);
    } else {
        return (Cls) => autoredrawDecorator(Cls, ...args);
    }
}
