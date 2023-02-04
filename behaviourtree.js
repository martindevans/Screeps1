class BehaviourTree
{
    constructor(root)
    {
        this.root = root;
        this.multitick = 15;
    }

    tick(state, blackboard)
    {
        for (let i = 0; i < this.multitick; i++)
        {
            let status = this.tick_single(state, blackboard);
            if (status != Status.Success) {
                break;
            }
        }
    }

    tick_single(state, blackboard)
    {
        state.root = state.root || {};
        this.root.tick(state.root, blackboard);
        return (state, blackboard);
    }
}

const Status = {
    Running: 'Running',
    Success: 'Success',
    Failure: 'Failure',
};

// Log a message and succeed
class Log
{
    constructor(message)
    {
        this.message = message;
    }

    tick(state, blackboard)
    {
        let message = this.message;
        if (typeof(message) == "function")
            message = message(blackboard);

        console.log(message);
        return Status.Success;
    }
}

class Say
{
    constructor(message)
    {
        this.message = message;
    }

    tick(state, blackboard)
    {
        let message = this.message;
        if (typeof(message) == "function")
            message = message(blackboard);

        let creep = Game.creeps[blackboard.creep_name];
        creep.say(message);
        return Status.Success;
    }
}

// Log a message and succeed
class Success
{
    constructor(message)
    {
        this.message = message;
    }

    tick(state, blackboard)
    {
        if (this.message) {
            console.log(this.message);
        }
        return Status.Success;
    }
}

// Log a message and fail
class Failure
{
    constructor(message)
    {
        this.message = message;
    }

    tick(state, blackboard)
    {
        if (this.message) {
            console.log(this.message);
        }
        return Status.Failure;
    }
}

// Log a message and keep running forever
class Forever
{
    constructor(message)
    {
        this.message = message;
    }

    tick(state, blackboard)
    {
        if (this.message) {
            console.log(this.message);
        }
        return Status.Running;
    }
}

// Run nodes in sequence, fails as soon as any child fails, succeeds once all nodes have run successfully.
class Sequence
{
    constructor(children)
    {
        this.children = children;
    }

    tick(state, blackboard)
    {
        state.self = "Sequence";

        try
        {
            if (!state.hasOwnProperty("index") || state.index >= this.children.length)
            {
                state.child_state = {};
                state.index = 0;
            }

            while (true)
            {
                switch (this.children[state.index].tick(state.child_state, blackboard))
                {
                    case Status.Running:
                        return Status.Running;

                    case Status.Success:
                        state.child_state = {};
                        state.index++;
                        if (state.index < this.children.length) {
                            continue;
                        } else {
                            return Status.Success;
                        }
                    
                    case Status.Failure:
                        state.child_state = {};
                        state.index = 0;
                        return Status.Failure;
                }
            }
        }
        catch (ex)
        {
            console.log("BT `Sequence[" + state.index + "]` Exception: " + ex);
            console.log(ex.stack);
            return Status.Failure;
        }
    }
}

// Run nodes in sequence, fails if _all_ fail, succeeds as soon as one succeeds.
class Selector
{
    constructor(children)
    {
        this.children = children;
    }

    tick(state, blackboard)
    {
        state.self = "Selector";

        try
        {
            if (!state.hasOwnProperty("index"))
            {
                state.child_state = {};
                state.index = 0;
            }

            while (true)
            {
                if (state.index >= this.children.length) {
                    delete state.child_state;
                    delete state.index;
                    return Status.Failure;
                }

                switch (this.children[state.index].tick(state.child_state, blackboard))
                {
                    case Status.Running:
                        return Status.Running;

                    case Status.Success:
                        delete state.child_state;
                        delete state.index;
                        return Status.Success;
                    
                    case Status.Failure:
                        state.child_state = {};
                        state.index++;
                        continue;
                }
            }
        }
        catch (ex)
        {
            console.log("BT `Selector` Exception: " + ex);
            console.log(ex.stack);
            return Status.Failure;
        }
    }
}

// Run a predicate function and map truthy=>success, falsy=>Failure
class Predicate
{
    constructor(predicateFunc)
    {
        if (!predicateFunc) {
            throw Error("Null predicateFunc");
        }
        this.predicateFunc = predicateFunc;
    }

    tick(state, blackboard)
    {
        state.self = "Predicate"

        try
        {
            let result = this.predicateFunc(blackboard);
            return result ? Status.Success : Status.Failure;
        }
        catch (ex)
        {
            console.log("BT `Predicate` Exception: " + ex);
            console.log(ex.stack);
            return Status.Failure;
        }
    }
}

// Runs a random node
class Random
{
    constructor(children)
    {
        this.children = children;
    }

    tick(state, blackboard)
    {
        state.self = "Random"

        try
        {
            if (!state.hasOwnProperty("index"))
            {
                state.child_state = {};
                state.index = Math.floor(Math.random() * this.children.length);
            }

            switch (this.children[state.index].tick(state.child_state, blackboard))
            {
                case Status.Running:
                    return Status.Running;

                case Status.Success:
                    delete state.index;
                    delete state.child_state;
                    return Status.Success;
                
                case Status.Failure:
                    delete state.index;
                    delete state.child_state;
                    return Status.Failure;
            }
        }
        catch (ex)
        {
            console.log("BT `Random` Exception: " + ex);
            console.log(ex.stack);
            return Status.Failure;
        }
    }
}

// Keep repeatedly running `child` while `predicate` returns `Success`. Fails if predicate or child fail.
class While
{
    constructor(predicate, child)
    {
        this.predicate = predicate;
        this.child = child;
    }

    tick(state, blackboard)
    {
        state.self = "While"

        state.pred_state = state.pred_state || {};
        state.child_state = state.child_state || {};

        switch (this.predicate.tick(state.pred_state, blackboard))
        {
            case Status.Running:
                return Status.Running;

            case Status.Failure:
                delete state.pred_state;
                delete state.child_state;
                return Status.Failure;

            case Status.Success:
                delete state.pred_state;
                let c = this.child.tick(state.child_state, blackboard);
                switch (c)
                {
                    case Status.Running:
                        return Status.Running;

                    case Status.Success:
                        delete state.pred_state;
                        delete state.child_state;
                        return Status.Running;

                    case Status.Failure:
                        delete state.pred_state;
                        delete state.child_state;
                        return Status.Failure;
                }
        }
    }
}

// Run two behaviour trees simultaneously, fail if either fails. Succeed once both have succeeded.
class Parallel
{
    constructor(left, right)
    {
        this.left = left;
        this.right = right;
    }

    tick(state, blackboard)
    {
        state.self = "Parallel"

        state.left_finished = state.left_finished || false;
        state.right_finished = state.left_finished || false;
        state.left_state = state.left_state || {};
        state.right_state = state.right_state || {};

        if (!state.left_finished)
        {
            let leftStatus = this.left.tick(state.left_state, blackboard);
            if (leftStatus == Status.Success) {
                state.left_finished = true
            } else if (leftStatus == Status.Failure) {
                return Status.Failure;
            }
        }

        if (!state.right_finished)
        {
            let rightStatus = this.right.tick(state.right_state, blackboard);
            if (rightStatus == Status.Success) {
                state.right_finished = true
            } else if (rightStatus == Status.Failure) {
                return Status.Failure;
            }
        }

        return (state.left_finished && state.right_finished) ? Status.Success : Status.Running;
    }
}

// Keep repeating until failure.
class Repeat
{
    constructor(child)
    {
        this.child = child;
    }

    tick(state, blackboard)
    {
        state.self = "Repeat"

        state.child_state = state.child_state || {};
        let result = this.child.tick(state.child_state, blackboard);
        switch (result)
        {
            case Status.Running:
                return Status.Running;

            case Status.Failure:
                delete state.child_state;
                return Status.Success;

            case Status.Success:
                delete state.child_state;
                return Status.Running;
        }
    }
}

// Check a predicate, if it is true start running child.
class If
{
    constructor(predicate, child)
    {
        this.predicate = predicate;
        this.child = child;
    }

    tick(state, blackboard)
    {
        state.self = "If"

        if (!state.running) {
            if (!this.predicate(blackboard)) {
                return Status.Failure;
            }
            state.running = true;
        }

        state.child_state = state.child_state || {};
        let result = this.child.tick(state.child_state, blackboard);
        switch (result)
        {
            case Status.Running:
                return Status.Running;

            case Status.Failure:
                delete state.child_state;
                return Status.Failure;

            case Status.Success:
                delete state.child_state;
                return Status.Success;
        }
    }
}

class Wait
{
    constructor(ticks)
    {
        this.ticks = ticks;
    }

    tick(state, blackboard)
    {
        state.self = "Wait"

        if (!state.running) {
            state.running = true;
            state.started = Game.time;
        }

        const elapsed = Game.time - state.started;

        if (elapsed < this.ticks) {
            return Status.Running;
        } else {
            return Status.Success;
        }
    }
}

module.exports = {
    BehaviourTree,
    Status,

    Log,
    Say,
    Success,
    Failure,
    Forever,

    Sequence,
    Selector,
    Predicate,
    Random,
    While,
    Parallel,
    Repeat,
    If,
    Wait
};