const { Status } = require("./behaviourtree");

const ORIGIN = "pf_origin";
const DEST = "pf_dest";
const PATH = "pf_path";

// Find a path to the within RANGE of the DEST
class Pathfind
{
    constructor()
    {
    }

    tick(state, blackboard)
    {
        let origin = blackboard[ORIGIN];
        delete blackboard[ORIGIN];
        let dest = blackboard[DEST];
        delete blackboard[DEST];

        if (!origin) {
            return Status.Failure;
        }
        if (!dest) {
            return Status.Failure;
        }

        let result = PathFinder.search(origin, dest);
        if (result.incomplete) {
            return Status.Failure;
        }

        console.log(JSON.stringify(origin));
        blackboard[PATH] = result.path;
        return Status.Success;
    }
}

class Pathfollow
{
    constructor(early_stopping)
    {
        this.early_stopping = early_stopping;
    }

    tick(state, blackboard)
    {
        let creep = Game.creeps[blackboard.creep_name];
        let path = blackboard[PATH];

        console.log("C:" + JSON.stringify(creep.pos));
        console.log("P:" + JSON.stringify(path));

        if (!path) {
            return Status.Failure;
        }

        let result = creep.moveByPath(path);
        if (result != 0) {
            console.log("R: " + result);
            delete blackboard[PATH];
            return Status.Failure;
        }

        if (this.early_stopping(blackboard)) {
            delete blackboard[PATH];
            return Status.Success;
        }

        return Status.Running;
    }
}

class MoveTo
{
    constructor(early_stopping)
    {
        this.early_stopping = early_stopping;
    }

    tick(state, blackboard)
    {
        let creep = Game.creeps[blackboard.creep_name];
        if (creep == null)
        {
            blackboard.debug_str = "pathfinding_fail1";
            console.log("Cannot run `MoveTo` without setting `blackboard.creep_name`");
            return Status.Failure;
        }

        let destSpec = blackboard[DEST];
        if (destSpec == null) {
            blackboard.debug_str = "pathfinding_fail2";
            console.log("Cannot run `MoveTo` without setting `blackboard[DEST]`");
            return Status.Failure;
        }
        let dest = new RoomPosition(destSpec.x, destSpec.y, destSpec.roomName);

        if (this.early_stopping && this.early_stopping(blackboard)) {
            blackboard.debug_str = "pathfinding_success1";
            return Status.Success;
        }

        let cpos = creep.pos;
        if (cpos.x == dest.x && cpos.y == dest.y && cpos.roomName == dest.roomName) {
            blackboard.debug_str = "pathfinding_success2";
            return Status.Success;
        }

        //console.log(JSON.stringify(dest))
        let result = creep.moveTo(dest, {
            visualizePathStyle: {
                fill: 'transparent',
                stroke: '#faa',
                lineStyle: 'dashed',
                strokeWidth: .15,
                opacity: .1
            }
        });

        if (result == ERR_TIRED) {
            blackboard.debug_str = "pathfinding_running_tired";
            return Status.Running
        }

        if (result == ERR_NO_PATH) {
            blackboard.debug_str = "pathfinding_no_path";
            creep.say("No Path!");
            return Status.Failure;
        }

        //creep.say("mov" + result + ":" + dest.x + "/" + dest.y)
        //console.log("MoveTo result: " + result);
        blackboard.debug_str = "pathfinding_final_" + result;
        return result == 0 ? Status.Running : Status.Failure;
    }
}

function setup_pathfind_to_find_id(blackboard)
{
    return setup_pathfind_to(blackboard, "find_id");
}

function setup_pathfind_to(blackboard, id_key)
{
    let object = Game.getObjectById(blackboard[id_key]);
    if (!object || !object.pos) {
        return false;
    }
    blackboard[DEST] = object.pos;
    return true;
}

function setup_pathfind_to_pos(blackboard, pos)
{
    let creep = Game.creeps[blackboard.creep_name];

    if (!pos.hasOwnProperty("roomName")) {
        pos.roomName = creep.pos.roomName;
    }

    blackboard[DEST] = pos;
    return true;
}

module.exports = {
    Pathfind,
    Pathfollow,
    MoveTo,

    ORIGIN,
    DEST,
    PATH,

    setup_pathfind_to_find_id,
    setup_pathfind_to,
    setup_pathfind_to_pos
}