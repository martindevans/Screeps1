const bt = require("behaviourtree");
const bp = require("behaviourpaths");
const act = require("actions");
const find = require("utils.find")

const tree = new bt.BehaviourTree(
    new bt.Sequence([
        new bt.Predicate(find.energy_source),
        new bt.Say("Checking"),
        new bt.Predicate(check_container),
        new bt.Say("Mining"),
        new bt.While(
            new bt.Predicate(_ => true),
            new bt.Sequence([
                new bt.Predicate(bb => act.drop(bb, RESOURCE_ENERGY)),
                new bt.Selector([
                    new bt.Predicate(act.harvest),
                    new bt.Sequence([
                        new bt.Say("Moving"),
                        new bt.Predicate(bb => bp.setup_pathfind_to_pos(bb, bb.override_pos)),
                        new bp.MoveTo(),
                    ])
                ])
            ]),
        )
    ])
);

function check_container(blackboard)
{
    function log(msg) {
        //console.log(msg);
    }

    log("Enter Check Container");

    let creep = Game.creeps[blackboard.creep_name];
    let ovpos = new RoomPosition(blackboard.override_pos.x, blackboard.override_pos.y, creep.pos.roomName);
    log(" > Got Creep " + creep.pos);

    let structures = creep.room.lookForAt(LOOK_STRUCTURES, ovpos);
    log(" > Found " + structures.length + " structures")
    for (let idx in structures)
    {
        let structure = structures[idx];
        if (structure.structureType == STRUCTURE_CONTAINER) {
            return true;
        }
    }
    log(" > Checked Structures");

    let sites = creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, ovpos);
    log(" > Found " + sites.length + " sites")
    for (let idx in sites)
    {
        let site = sites[idx];
        if (site.structureType == STRUCTURE_CONTAINER) {
            return true;
        }
    }
    log(" > Checked Sites");

    creep.room.createConstructionSite(blackboard.override_pos.x, blackboard.override_pos.y, STRUCTURE_CONTAINER);

    log(" > Created Site " + creep.pos);
    log("Exit Check Container");
    
    return true;
}

var roleHarvester =
{
    run: function(creep)
    {
        tree.tick(creep.memory.bt_state, creep.memory.bt_board);
    }
};

module.exports = roleHarvester;

