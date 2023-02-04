var bt = require("behaviourtree");
var re = require("room.respawn");
var ex = require("room.extractor.minerals");
var tr = require("room.trade");

function check_level(level) { return blackboard => Game.rooms[blackboard.room_name].controller.level == level; }

let tree = new bt.BehaviourTree(
    new bt.Selector([
        new bt.Sequence([
            new bt.Predicate(blackboard => Game.rooms[blackboard.room_name].controller === undefined),
            new bt.Success(),
        ]),
        new bt.Sequence([
            new bt.Predicate(check_level(1)),
            new bt.Predicate(setup_harvesters)
            //new bt.Log("Level 1"),
        ]),
        new bt.Sequence([
            new bt.Predicate(check_level(2)),
            //new bt.Log("Level 2"),
        ]),
        new bt.Sequence([
            new bt.Predicate(check_level(3)),
            //new bt.Log("Level 3"),
        ]),
        new bt.Sequence([
            new bt.Predicate(check_level(4)),
            //new bt.Log("Level 4"),
        ]),
        new bt.Sequence([
            new bt.Predicate(check_level(5)),
            //new bt.Log("Level 5"),
        ]),
        new bt.Sequence([
            new bt.Predicate(check_level(6)),
            //new bt.Log("Level 6"),
        ]),
        new bt.Sequence([
            new bt.Predicate(check_level(7)),
            //new bt.Log("Level 7"),
        ]),
        new bt.Sequence([
            new bt.Predicate(check_level(8)),
            //new bt.Log("Level 8"),
        ]),
    ])
)

function setup_harvesters(blackboard)
{
    if (blackboard.energy_surveyed) {
        return true;
    }

    let room = Game.rooms[blackboard.room_name];
    let sources = room.find(FIND_SOURCES);
    let survey = [];

    for (let idx in sources)
    {
        let deposit = sources[idx];
        survey.push({
            id: deposit.id
        });
    }

    blackboard.energy_survey = survey;
    blackboard.energy_surveyed = true;
    console.log("Completed Energy Survey: " + room.name);
}

var managerRoom =
{
    run: function(room)
    {
        re.respawn(room);
        ex.extract(room);
        tr.trade(room);
        tree.tick(room.memory.bt_state, room.memory.bt_board);
    }
}

module.exports = managerRoom;