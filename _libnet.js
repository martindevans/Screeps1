const VERSION = "_libnet_V001";
const RECORD_MAGIC = "RCD"
const NETWORK_SEGMENT_ID = 99;
const MEM_KEY = "__libnet";

let _self = "undefined";
let _memory_map = [];

// Memory map:
// [0:11] Version Prefix: "_libnet_VXXX"
// [12:292] 100 x Record (see below)
// [293:1000] Data Segment
//
// Record:
// [0:2]   Record magic: "RCD"
// [3:10]  Sender ID (FNV32 hash of username)
// [11:18] Receiver ID (FNV32 hash of username)
// [19:23] Index of data start (base 32)
// [24:28] Length of data (base 32)

/**
 * Calculate a 32 bit FNV-1a hash
 * Found here: https://gist.github.com/vaiorabbit/5657561
 * Ref.: http://isthe.com/chongo/tech/comp/fnv/
 *
 * @param {string} str the input value
 * @param {integer} [seed] optionally pass the hash of the previous chunk
 * @returns {string}
 */
 function FNV32(str, seed)
 {
    var i, l,
        hval = (seed === undefined) ? 0x811c9dc5 : seed;

    for (i = 0, l = str.length; i < l; i++)
    {
        hval ^= str.charCodeAt(i);
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }

    // Convert to 8 digit hex string
    return ("0000000" + (hval >>> 0).toString(16)).slice(-8);
}

function* ReadRecordsGenerator(data)
{
    // Check version compatibility (must exactly match)
    let dataVersion = data.slice(0, 12);
    if (dataVersion != VERSION) {
        throw new Error(`libnet version mismatch. Expected '${VERSION}' but found '${dataVersion}'`)
    }

    for (let i = 0; i < 100; i++)
    {
        let start = 12 + 29 * i;
        let end = start + 29;
        let record = data.slice(start, end);

        // Check per-record magic
        if (record.slice(0, 3) != RECORD_MAGIC) {
            continue;
        }

        let sender = record.slice(3, 11);
        let receiver = record.slice(11, 19);
        let idxstart = parseInt(record.slice(19, 24), 32);
        let len = parseInt(record.slice(24, 29), 32);

        yield {
            sender: sender,
            receiver: receiver,
            start: idxstart,
            len: len
        };
    }
}

function BuildMemoryMap(data)
{
    let memory_map = [{start:293, end:1000}];
    for (const packet of ReadRecordsGenerator(data))
    {
        // Find a block which contains this packet
        let idx = memory_map.findIndex(a => a.start <= packet.start && a.end >= packet.start + packet.len);
        if (idx == -1) {
            throw new Error("Invalid memory structure");
        }
        let block = memory_map[idx];

        // Split the block by the packet
        let before = {start:block.start, end:packet.start - 1};
        let after = {start:packet.start+packet.len, end:block.end};

        // Remove the old block and splice in the new one
        memory_map.splice(idx, 1);
        memory_map.splice(idx, 0, before, after);
    }
    memory_map = memory_map.filter(x => x.end - x.start > 0);

    return memory_map;
}

// Open a foreign memory segment
function open_foreign(username)
{
    // Switch to listen to that user
    RawMemory.setActiveForeignSegment(username);

    // Check if we were already listening to that source
    const segment = RawMemory.foreignSegment;
    if (!segment) {
        return false;
    }
    if (segment.username != username) {
        return false;
    }

    return true;
}

// Open a local raw memory segment
function open_self()
{
    // Switch to listen to that user
    RawMemory.setActiveSegments([NETWORK_SEGMENT_ID]);

    // Check if that segment is already available
    if (!(NETWORK_SEGMENT_ID in RawMemory.segments)) {
        return false;
    }

    // Get the current segment data
    let data = RawMemory.segments[NETWORK_SEGMENT_ID];

    // Check if the version magic matches, if not overwrite the segment
    if (!data.slice(0, 12) != VERSION) {
        RawMemory.segments[NETWORK_SEGMENT_ID] = VERSION;
    }

    return true;
}

// Send a message to the given destination
function try_send(destination, message)
{
    // Open the foreign segment for the given username, proceed if it was already open
    if (!open_self()) {
        return false;
    }

    // Check the memory is available and compatible
    let data = RawMemory.segments[NETWORK_SEGMENT_ID];
    if (!data) {
        return false;
    }
    if (data.slice(0, 12) != VERSION) {
        data = VERSION;
    }

    // Read all current segments into an array
    let segments = [...ReadRecordsGenerator(data)];

    // Try to find some free space to put this packet into

    throw new Error("Not Implemented: send");

    // Failed to find free space, remove some records until there's enough free space

    throw new Error("Not Implemented: send");
}

// Get all message from the given source. Null result indicates that you should call this again next tick.
function try_receive(username)
{
    // Open the foreign segment for the given username, proceed if it was already open
    if (!open_foreign(username)) {
        return null;
    }

    // Check if the version of the network system is compatible
    const data = RawMemory.foreignSegment.data;
    if (data.slice(0, 12) != VERSION) {
        return null;
    }

    // Get all packets sent to receiving user
    let packets = [];
    for (const packet of ReadRecordsGenerator(data)) {
        if (packet.receiver == _self) {
            packet.data = data.slice(packet.start, packet.start+packet.len);
            packets.push(packet);
        }
    }

    return packets;
}

// Initialise RawMemory segment `NETWORK_SEGMENT_ID` as public
function init(username)
{
    _self = FNV32(username);
    RawMemory.setPublicSegments([NETWORK_SEGMENT_ID]);
    RawMemory.setDefaultPublicSegment(NETWORK_SEGMENT_ID);

    // Setup persistent storage
    if (!Memory[MEM_KEY]) {
        Memory[MEM_KEY] = {
            sequence_number: 0
        };
    }
}

function test()
{
    run_test(ReadSegments);
    run_test(BuildMemMap);

    function run_test(func)
    {
        try {
            func();
        } catch (e) {
            console.log("FAIL test '" + func.name + "' " + e);
            console.log(e.stack);
        }
    }

    function assert(condition, message) {
        if (condition) {
            throw new Error(message);
        }
    }

    function assert_eq(expected, actual) {
        if (expected != actual) {
            throw new Error(`Expected ${expected} == ${actual}`);
        }
    }

    function ReadSegments()
    {
        const str = VERSION
            + RECORD_MAGIC
            + "SENDER00"
            + "RECEIVER"
            + ("00000" + (293).toString(32)).slice(-5)
            + ("00000" + (7).toString(32)).slice(-5)
            + RECORD_MAGIC
            + "SENDER01"
            + "RECEIVER"
            + ("00000" + (888).toString(32)).slice(-5)
            + ("00000" + (111).toString(32)).slice(-5)

        let gen = ReadRecordsGenerator(str);

        let ret = gen.next();
        assert_eq(ret.value.sender, "SENDER00");
        assert_eq(ret.value.receiver, "RECEIVER");
        assert_eq(ret.value.start, 293);
        assert_eq(ret.value.len, 7);

        ret = gen.next();
        assert(ret.done, "Done Check");
        assert_eq(ret.value.sender, "SENDER01");
        assert_eq(ret.value.receiver, "RECEIVER");
        assert_eq(ret.value.start, 888);
        assert_eq(ret.value.len, 111);
    }

    function BuildMemMap()
    {
        const str = VERSION
            + RECORD_MAGIC
            + "SENDER00"
            + "RECEIVER"
            + ("00000" + (293).toString(32)).slice(-5)
            + ("00000" + (7).toString(32)).slice(-5)
            + RECORD_MAGIC
            + "SENDER01"
            + "RECEIVER"
            + ("00000" + (888).toString(32)).slice(-5)
            + ("00000" + (111).toString(32)).slice(-5)

        let map = BuildMemoryMap(str);

        assert_eq(map[0].start, 300);
        assert_eq(map[0].end, 887);
        assert_eq(map[1].start, 999);
        assert_eq(map[1].end, 1000);
    }
}

module.exports = {
    VERSION,
    NETWORK_SEGMENT_ID,

    init,
    try_send,
    try_receive,

    test,
};