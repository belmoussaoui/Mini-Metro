
var $config = {
    type: Phaser.AUTO,
    resolution: window.devicePixelRatio,
    width: 800,
    height: 600,
    backgroundColor: '#eeeede',
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    }
};

var $dataGame = {
    lines: ['0xfacc04', '0xee3024', '0x164eac'],
        //SYSTEM1 : '0x443233',
    shapes: {
        CIRCLE: 1,
        TRIANGLE: 2,
        RECT: 3
    }
};

var $dataTest = {
    'water': [170, 0-8, 170, 600+8, 215, 600+8, 215, 0-8]
};

var $game = null;
var $gameMap = null;
var $gameManager = null;

window.onload = function() {
    $game = new Phaser.Game($config);
    initScenes();
    createGame();
};

function initScenes() {
    $game.scene.add("Game", SceneGame, true);
};

function createGame() {
    $gameMap = new Game_Map();
    $gameManager = new Game_Manager();
    $gameTime = new Game_Time();
};

//-----------------------------------------------------------------------------
// SceneGame

class SceneGame extends Phaser.Scene {
    constructor() {
        super();
    }
    
    init() {
        $gameMap.init(this);
        $gameManager.scene = this;
    }

    preload() {
        this.load.svg('clock', '/assets/clock.svg', {scale:1});
        this.load.svg('pause', '/assets/pause.svg', {scale:1});
        this.load.svg('play1', '/assets/play1.svg', {scale:1});
        this.load.svg('play2', '/assets/play2.svg', {scale:1});
    }
    
    create() {
        $gameTime.create(this);
    }
    
    update(time, delta) {
        for (var i = 0; i < $gameTime.scale; i++) {
            $gameTime.update(delta);
            $gameMap.update();
        }
    }
};

//-----------------------------------------------------------------------------
// Game_Manager

class Game_Manager {
    constructor() {
        this.scene = null;
        this.line = null;
        this.isNewLine = false;
        this.route = null;
        this.station = null;
        this.index = -1;
    }

    canCreateLine(i) {
        return !this.line && $gameMap.canCreateLine();
    }

    startExtend(station) {
        this.station = station;
        this.line = $gameMap.getLine(station);
        if (this.canCreateLine()) {
            this.createLine(station);
        }
        if (!this.line) {
            return;
        }
        if (this.line.isLoop()) {
            this.okDelete();
        } else {
            this.createRoute(station);
        }
    }

    createLine(station) {
        this.line = $gameMap.getNewLine();
        this.isNewLine = true;
    }

    createRoute(station, startAngle) {
        this.index = this.line.stations().indexOf(station);
        this.route = new Game_Route(this.scene, this.line, station);
        if (startAngle) {
            this.route.startAngle = startAngle;
        }
    }

    isReverseExtend() {
        return this.index === 0 && !this.isNewLine;
    }

    updateExtend(x, y) {
        if (!this.line) {
            return;
        }
        this.line.updateExtend(this.route, x, y);

        var station = $gameMap.getStation(x, y);
        if (this.isValidExtend(station)) {
            this.okExtend(station);
        }
        else if (this.isValidDelete(station)) {
           this.okDelete();
        }
        this.station = station;
    }

    okExtend(s) {
        this.route.addStation(s);
        if (!this.isReverseExtend()) {
            this.line.updateExtend(this.route, s.x, s.y);
            this.line.addLast(this.route);
        } else {
            this.reverseRoute(s)
            this.line.addFirst(this.route);
        }
        this.createRoute(s);
        if (this.line.isLoop()) {
            this.line.loop();
            this.cancelExtend();
        }
    }

    okDelete() {
        var station = null;
        var l = this.line;
        var s = l.stations();
        if (!this.isReverseExtend()) {
            var station = l.end.stationA();
            var a = l.end.startAngle;
            l.deleteLast();
        } else {
            var station = l.start.stationB();
            var a = l.start.startAngle;
            l.deleteFirst();
        }
        this.createRoute(station, a);
    }

    reverseRoute(s) {
        var x = this.route.startPoint.x;
        var y = this.route.startPoint.y;
        this.route.reverse(s.x, s.y);
        this.line.updateExtend(this.route, x, y);
    }

    cancelExtend() {
        if (!this.line) {
            return;
        }
        this.line.cancelExtend();
        if (this.line.getLength() > 0) {
            if (this.isNewLine) {
                $gameMap.createLoco(this.line);
            }
        }
        this.route.destroy();
        this.clear();
    }

    clear() {
        this.route = null;
        this.line = null;
        this.isNewLine = false;
        this.index = -1;
        this.station = null;
    }

    isValidExtend(s) {
        return s && this.station !== s && this.line.canAdd(s) && this.route.canAdd(s);
    }

    isValidDelete(s) {
        return s && this.station !== s && this.line.canDelete(s);
    }
}

//-----------------------------------------------------------------------------
// Game_Time

class Game_Time {
    constructor() {
        this.count = 0;
        this.scale = 1;
        this.clock = null;
        this.scene = null;
        this.hand = null;
    }

    create(scene) {
        this.scene = scene;
        this.clock = scene.add.image(750, 40, 'clock');
        this.pause = this.createButton(750, 85, 'pause');
        this.pause.on('pointerdown', () => this.onPause());
        this.play1 = this.createButton(751, 110, 'play1');
        this.play1.on('pointerdown', () => this.onPlay1());
        this.play2 = this.createButton(752, 135, 'play2');
        this.play2.on('pointerdown', () => this.onPlay2());
        this.onPlay1();
        this.createHand();
    }

    onPause() {
        this.scale = 0;
        this.clearAlpha();
        this.pause.setAlpha(0.3);
        $gameMap.pause();
    }

    onPlay1() {
        this.scale = 1;
        this.clearAlpha();
        this.play1.setAlpha(0.3);
        $gameMap.play();
    }

    onPlay2() {
        this.scale = 3;
        this.clearAlpha();
        this.play2.setAlpha(0.3);
        $gameMap.play();
    }

    clearAlpha() {
        this.pause.setAlpha(1);
        this.play1.setAlpha(1);
        this.play2.setAlpha(1);
    }

    createButton(x, y, texture) {
        var button = this.scene.add.image(x, y, texture);
        button.setInteractive();
        button.on('pointerover', () => this.scene.tweens.add({
            targets: button,
            scale: 1.15,
            duration: 100,
            repeat: 0
        }));
        button.on('pointerout', () => this.scene.tweens.add({
            targets: button,
            delay:100,
            scale: 1,
            duration: 100,
            repeat: 0
        }));
        return button;
}

    createHand() {
        const graphics = this.scene.add.graphics();
        graphics.fillStyle('0x443233', 1);
        graphics.fillRect(34, 37, 4, -13);
        graphics.generateTexture('hand', 72, 72);
        graphics.destroy();
        this.hand = this.scene.add.image(750, 40, 'hand');
    }

    update(delta) {
        this.count += delta / 1000;
        this.hand.angle = (this.count % 12) * 30;
    }

    hour() {
        return this.count % 24;
    }
}

//-----------------------------------------------------------------------------
// Game_Passenger

class Game_Passenger extends Phaser.GameObjects.Graphics {
    static id = 0;
    constructor(scene, station, shape) {
        super(scene);
        scene.add.existing(this);
        this.id = ++Game_Passenger.id;
        this.parent = station;
        this.shape = shape;
        this.create();
    }

    setStyle() {
        this.fillStyle('0x443233', 1);
    }

    isInStation() {
        return this.parent instanceof Game_Station;
    }

    isInLoco() {
        return this.parent instanceof Game_Loco;
    }

    create() {
        this.clear();
        this.setStyle();
        var s = $dataGame.shapes;
        switch(this.shape) {
        case s.CIRCLE:
            this.createCircle();
            break;
        case s.TRIANGLE:
            this.createTriangle();
            break;
        case s.RECT:
            this.createRect();
            break;
        }
    }

    createCircle() {
        var size = this.isInStation() ? 8 : 6;
        this.fillCircle(0, 0, size);
    }

    createTriangle() {
        if (this.isInStation()) {
            this.fillTriangle(-9, 7, 0, -8, 9, 7);
        } else {
            this.fillTriangle(-5, 6, -5, -6, 6, 0);
        }
    }

    createRect() {
        var p = this.isInStation() ? [-7, -7, 14, 14] : [-5, -5, 10, 10];
        this.fillRect(p[0], p[1], p[2], p[3]);
    }

    isValid(loco) {
        var nextShapes = loco.nextShapes();
        return nextShapes.includes(this.shape);
    }

    getOn(loco) {
        this.parent = loco;
        loco.addPassenger(this);
        this.create();
    }

    getOff(station) {
        this.parent = station;
        this.create();
    }
}

//-----------------------------------------------------------------------------
// Game_Container
//
// The game object class for a container. He assigns/releases a seat to a passenger.

class Game_Container extends Phaser.GameObjects.Container {
    constructor(scene, car) {
        super(scene, 0, 0, null);
        scene.add.existing(this);
        this.car = car;
        this.seats = [];
    }

    numRows() {
        return 3;
    }

    validSeats() {
        var list = []
        for (var i = 0; i < this.car.capacity; i++) {
            if (this.seats[i] === undefined) {
                list.push(i);
            }
        }
        return list;
    }

    assignSeat(passenger) {
        var seatsId = this.validSeats();
        var random = Phaser.Math.Between(0, seatsId.length - 1);
        var index = seatsId[random];
        this.seats[index] = passenger.id;
        this.add(passenger);
        this.setPosPassenger(passenger, index);
    }

    setPosPassenger(passenger, index) {
        var x = this.passengerX(index);
        var y = this.passengerY(index);
        passenger.setPosition(x, y);
    }

    passengerX(index) {
        return -12 + (index % this.numRows()) * 12;
    }

    passengerY(index) {
        return -6 + Math.floor(index / this.numRows()) * 12;
    }

    releaseSeat(passenger) {
        var index = this.seats.indexOf(passenger.id);
        this.seats[index] = undefined;
        this.remove(passenger);
    }

    update() {
        this.x = this.car.x;
        this.y = this.car.y;
        this.rotation = this.car.rotation;
    }
}

//-----------------------------------------------------------------------------
// Game_Car

class Game_Car extends Phaser.GameObjects.PathFollower {
    constructor(scene, line) {
        Game_Car.createTexture(scene, line);
        super(scene, null, 0, 0, 'car' + line.lineId);
        scene.add.existing(this);
        this.container = new Game_Container(scene, this);
        this.capacity = 6;
        this.passengers = [];
        this.line = line;
        this.route = null;
        this.direction = 1;
        this.t = 0;
    }

    static createTexture(scene, line) {
        var graphics = scene.add.graphics();
        graphics.fillStyle(line.getColor(), 1);
        graphics.fillRect(0, 0, 44, 26);
        graphics.generateTexture('car' + line.lineId, 44, 26);
        graphics.destroy();
    }

    isFull() {
        return this.passengers.length >= this.capacity;
    }

    isEmpty() {
        return this.passengers.length === 0;
    }
    
    addPassenger(passenger) {
        this.passengers.push(passenger);
        this.container.assignSeat(passenger);
    }

    removePassenger(passenger) {
        var index = this.passengers.indexOf(passenger);
        this.passengers.splice(index, 1);
        this.container.releaseSeat(passenger);
    }

    setRoute(route) {
        if (this.route) {
            this.route.removeLoco(this);
        }
        this.route = route;
        this.route.addLoco(this);
        this.route.setPath(this);
    }

    update() {
        this.container.update();
    }

    getShapePassengers(shape) {
        return this.passengers.filter(function(passenger) {
            return passenger.shape === shape;
        }, this);
    }
}


//-----------------------------------------------------------------------------
// Game_Loco

class Game_Loco extends Game_Car {
    constructor(scene, line) {
        super(scene, line);
        this.routeIndex = 0;
        this.speed = 0;
        this.topSpeed = 3;
        this.accel = 0.02;
        this.cars = [];
        this.distance = 0;
        this.t = 0;
        this.onStart();
    }

    onStart() {
        this.line.setLocoStart(this);
        var pos = this.path.getPoint(this.t);
        this.setPosition(pos.x, pos.y);
        this.onDepart();
    }

    onDepart() {
        var station = this.getStation();
        station.depart(this);
    }

    changeDirection() {
        this.direction = -this.direction;
    }

    isMoving() {
        return this.t < 1 && this.t > 0;
    }

    nextShapes() {
        return this.line.getShapes(this.direction, this.route);
    }

    getStation() {
        return this.route.getStation(Math.round(this.t));
    }

    needsSlowDown() {
        return this.path.getLength() - this.distance < this.brakingDistance();
    }

    brakingDistance() {
        return Math.pow(this.speed, 2) / (this.accel * 4);
    }

    update() {
        super.update();
        var x = this.x;
        var y = this.y;
        this.updateSpeed();
        this.updatePosition();
        if (this.isMoving()) {
            this.updateRotation(x, y);
        }
    }

    updateSpeed() {
        if (this.needsSlowDown()) {
            this.speed = this.speed - this.accel * 2;
            this.speed = Math.max(this.speed, this.accel);
        } else {
            this.speed = this.speed + this.accel;
            this.speed = Math.min(this.speed, this.topSpeed);
        }
    }

    updatePosition() {
        this.t += this.distancePerFrame() * this.direction;
        //this.t = Math.min(Math.max(0, this.t), 1);
        if (this.isMoving()) {
            var pos = this.path.getPoint(this.t);
            var oldPos = new Phaser.Math.Vector2(this.x, this.y);
            this.distance += pos.distance(oldPos);
            this.setPosition(pos.x, pos.y);
        } else {
            this.distance = 0;
            this.onArrival();
        }
    }

    distancePerFrame() {
        return this.speed / this.path.getLength();
    }

    updateRotation(oldX, oldY) {
        this.rotation = Math.atan2(this.y - oldY, this.x - oldX);
    }

    nextRoute() {
        this.route.setLocoNext(this);
        this.t = this.direction > 0 ? 0 : 1;
    }

    nextRouteIndex() {
        this.routeIndex += this.direction;
    }

    onArrival() {
        this.speed = 0;
        var station = this.getStation();
        station.arrival(this);
        this.nextRoute();
        // wait
        this.onDepart();
    }
}

//-----------------------------------------------------------------------------
// Window_Time

//-----------------------------------------------------------------------------
// Window_Line

//-----------------------------------------------------------------------------
// Window_Item

//-----------------------------------------------------------------------------
// Action_Create


//-----------------------------------------------------------------------------
// Game_Map

class Game_Map {
    constructor() {
        this.width = 16;
        this.height = 12;
        this.tileSize = 48;
        this.lines = [];
        this.metro = [];
        this.tiles = [];
        this.stations = [];
        this.scene = null;
        this.zone = null;
        this.water = null;
        this.renderer = null;
        this.canvas = null;
        //layers = group[group, group]
    }

    init(scene) {
        this.scene = scene;
        this.createZone();
        this.water = new Phaser.Geom.Polygon($dataTest.water);
        for (var i = 0; i < 3; i++) {
            this.createStation(i + 1);
        }
        this.createTimers();
        this.canvas = scene.textures.createCanvas('map', 800, 600);
        this.renderer = new Phaser.GameObjects.RenderTexture(scene, 0, 0, 800, 600, 'map');
        scene.add.existing(this.renderer);
        this.drawWater(this.canvas.getContext());
        this.canvas.refresh();
        this.createLines();
    }

    drawWater(ctx) {
        ctx.fillStyle = '#c3e5f7';
        ctx.beginPath();
        ctx.moveTo($dataTest.water[0], $dataTest.water[1]);
        for (var i = 0; i < $dataTest.water.length; i += 2) {
            ctx.lineTo($dataTest.water[i], $dataTest.water[i+1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = "#64c9f2";
        ctx.stroke();
    }

    createLines() {
        for (var i = 0; i < 3; i++) {
            this.createLine(i + 1);
        }
    }

    canCreateLine() {
        return this.lines.some(function(line) {
            return !line.isCreated();
        });
    }

    getNewLine() {
        for (var i = 0; i < this.lines.length; i++) {
            if (!this.lines[i].isCreated()) {
                return this.lines[i];
            }
        }
        return false;
    }

    createTimers() {
        this.stationTimer = this.scene.time.addEvent({
            delay: Phaser.Math.Between(10000, 30000),
            callback: function() {
                    var list = [];
                    this.createStation(this.nextStationShape());
                    this.stationTimer.delay = Phaser.Math.Between(10000, 30000);
            },
            callbackScope: this,
            loop: true,
            timeScale: 1,
        });
    }

    nextStationShape() {
        var random = Math.random();
        if (random < 0.6) {
            return 1;
        } else if (random < 0.9) {
            return 2;
        } else {
            return 3
        }
    }

    createZone() {
        var zx = this.tileSize * 2;
        var zy = this.tileSize * 2;
        var zw = this.pixelWidth() - zx * 2;
        var zh = this.pixelHeight() - zy * 2;
        this.zone = new Phaser.Geom.Rectangle(zx, zy, zw, zh);

    }

    pixelWidth() {
        return this.width * this.tileSize;
    }

    pixelHeight() {
        return this.height * this.tileSize;
    }

    createStation(shape) {
        var tile = this.randomPosition();
        if (tile) {
            var x = this.tileX(tile);
            var y = this.tileY(tile);
            var station = new Game_Station(this.scene, x, y, shape);
            this.stations.push(station);
        }
    }

    tile(x, y) {
        return y * this.width + x;
    }

    tileX(tile) {
        return (tile % this.width) * this.tileSize;
    }

    tileY(tile) {
        return Math.floor(tile / this.width) * this.tileSize
    }

    tilesValid() {
        var tiles = [];
        for (var i = 0;  i < this.width * this.height; i++) {
            tiles.push(i);
            var x = this.tileX(i);
            var y = this.tileY(i);
            if (!this.zone.contains(x, y)) {
                tiles.pop();
                continue;
            }
             if (this.water.contains(x, y)) {
                tiles.pop();
                continue;
            }
            for (var j = 0;  j < this.stations.length; j++) {
                var station = this.stations[j];
                if (station.isCollided(x, y)) {
                    tiles.pop();
                    break;
                }
            }
        }
        //this.water.scale = 1;
        return tiles;
    }

    randomPosition(min, max) {
        var tiles = this.tilesValid();
        return tiles[Phaser.Math.Between(0, tiles.length - 1)];
    }

    getStation(x, y) {
        for (var i = 0; i < this.stations.length; i++) {
            var station = this.stations[i];
            if (station.contains(x, y)) {
                return station;
            }
        }
        return null;
    }

    createLine(lineId) {
        var line = new Game_Line(this.scene, lineId);
        this.lines.push(line);
    }

    removeLine() {
        var line = this.lines.pop();
        line.destroy();
    }

    getLine(s) {
        var res = null;
        for (var i = 0; i < this.lines.length; i++) {
            var line = this.lines[i];
            if (line.startStation() === s || line.endStation() === s) {
                return line;
            }
        }
        return null;
    }

    getLineIndex(index) {
        if (index === -1) {
            return this.lines[this.lines.length - 1];
        }
        return this.lines[index];
    }

    createLoco(line) {
        var loco = new Game_Loco(this.scene, line);
        this.metro.push(loco);
    }

    removeLoco(loco) {
        var i = this.metro.indexOf(loco);
        this.metro.splice(i, 1);
        loco.destroy();
    }

    update() {
        this.updateStation();
        this.updateTrain();
    }

    pause() {
        this.stationTimer.paused = true;
        this.stations.forEach(function(station) {
            station.pause();
        });
    }

    play() {
        this.stationTimer.paused = false;
        this.stationTimer.timeScale = $gameTime.scale;
        this.stations.forEach(function(station) {
            station.play();
        });
    }

    updateStation() {
        this.stations.forEach(function(station) {
            station.update();
        });
    }

    updateTrain() {
        this.metro.forEach(function(train) {
            train.update();
        });
    }

    canvasToMap(value) {
        return Math.floor(value / this.tileSize) * this.tileSize + this.tileSize / 2;
    }

    needsOffset(l) {
        for (var i = 0; i < this.lines.length; i++) {
            var line = this.lines[i];
            for (var j = 0; j < line.getLength(); j++) {
                var r = line.routes[j];
                if (r.isParallelIntersect(l)) {
                    return true;
                }
            }
        }
        return false;
    }
}

//-----------------------------------------------------------------------------
// Game_Station

class Game_Station extends Phaser.GameObjects.Graphics {
    static id = 0;
    constructor(scene, x, y, shape) {
        super(scene);
        scene.add.existing(this);
        this.id = ++Game_Station.id;
        this.x = x;
        this.y = y;
        this.shape = shape;
        this.capacity = 6;
        this.geom = null;
        this.collide = null;
        this.depth = 1;
        this.passengers = [];
        this.create();
    }

    create() {
        this.createGeom();
        this.createInput();
        this.createGraphics();
        this.createTimers();
    }

    createTimers() {
        this.eventTimer = this.scene.time.addEvent({
            delay: Phaser.Math.Between(1000, 10000),
            callback: function() {
                var list = [];
                // max shape or getallshapes
                for (var i = 1; i <= 3; i++) {
                    if (i !== this.shape) {
                        list.push(i);
                    }
                }
                var index = Phaser.Math.Between(0, list.length - 1);
                this.createPassenger(list[index]);
                this.eventTimer.delay = Phaser.Math.Between(10000, 30000)
            },
            callbackScope: this,
            loop: true,
            timeScale: 1
        });
        this.overGraphics = new Phaser.GameObjects.Graphics(this.scene);
        this.scene.add.existing(this.overGraphics);
        this.overTimer = this.scene.time.addEvent({
            delay: 60000,
            callback: function() {
                console.log('overTimer');
            },
            callbackScope: this,
            timeScale: 1
        });
        this.overTimer.paused = true;
    }

    isOverflow() {
        return this.passengers.length > this.capacity;
    }

    createGeom() {
        this.geom = new Phaser.Geom.Circle(0, 0, 20);
        this.collide = new Phaser.Geom.Circle(0, 0, $gameMap.tileSize * 3);
    }

    contains(x, y) {
        return this.geom.contains(x - this.x, y - this.y);
    }

    isCollided(x, y) {
        return this.collide.contains(x - this.x, y - this.y);
    }

    setStyle() {
        this.lineStyle(6, 0x443233, 1);
        this.fillStyle(0xfafaf7, 1);
    }

    createGraphics() {
        this.clear();
        //this.fillCircle(0, 0, $gameMap.tileSize * 3);
        var s = $dataGame.shapes;
        switch(this.shape) {
        case s.CIRCLE:
            this.createCircle();
            break;
        case s.TRIANGLE:
            this.createTriangle();
            break;
        case s.RECT:
            this.createRect();
            break;
        }
    }

    createPassenger(i) {
        var passenger = new Game_Passenger(this.scene, this, i);
        this.addPassenger(passenger);
        if (this.isOverflow()) {
            this.overTimer.paused = false;
        }
    }

    addPassenger(passenger) {
        this.passengers.push(passenger);
        var index = this.passengers.length - 1;
        passenger.x = this.passengerX(index);
        passenger.y = this.passengerY(index);
    }

    refreshPassengers() {
        for (var i = 0; i < this.passengers.length; i++) {
            var passenger = this.passengers[i];
            passenger.x = this.passengerX(i);
            passenger.y = this.passengerY(i);
        }
    }

    passengerX(index) {
        return this.x + index % 8 * (16 + 1) + 30;
    }

    passengerY(index) {
        return this.y + Math.floor(index / 8) * 16 - 8;
    }

    createCircle() {
        this.setStyle();
        this.fillCircle(0, 0, 16);
        this.strokeCircle(0, 0, 16);
    }

    createTriangle() {
        var height = function(h){ 
            return h * Math.sqrt(3) / 2;
        }
        var h1 = height(48);
        var h2 = height(26);
        this.fillStyle(0x443233, 1);
        this.fillTriangle(-24, h1/2-3, 0, -h1/2-3, 24, h1/2-3);
        this.fillStyle(0xfafaf7, 1);
        this.fillTriangle(-13, h2/2, 0, -h2/2, 13, h2/2);
    }

    createRect() {
        this.setStyle();
        this.fillRect(-14, -14, 28, 28);
        this.strokeRect(-14, -14, 28, 28);
    }

    createInput() {
        this.setInteractive(this.geom, Phaser.Geom.Circle.Contains);
        this.on('dragstart', this.onDragStart, this);
        this.on('drag', this.onDrag, this);
        this.on('dragend', this.onDragEnd, this);
        this.scene.input.setDraggable(this, true)
    }

    onDragStart(pointer) {
        $gameManager.startExtend(this);
    }

    onDrag(pointer, dragX, dragY) {
        $gameManager.updateExtend(dragX, dragY+8);
    }

    onDragEnd(pointer, dragX, dragY, dropped) {
        $gameManager.cancelExtend();
    }

    update() {
        this.overGraphics.clear();
        this.overGraphics.fillStyle(0x000000, .2);
        if (this.isOverflow()) {
            this.overGraphics.beginPath();
            this.overGraphics.moveTo(this.x, this.y);
            var start = -Math.PI / 2;
            var end = this.overTimer.getOverallProgress() * Math.PI * 2;
            this.overGraphics.arc(this.x, this.y, 40, start, end + start , false);
            this.overGraphics.closePath();
            this.overGraphics.fillPath();
        }
    }

    pause() {
        this.eventTimer.paused = true;
        this.overTimer.paused = true;
    }

    play() {
        this.eventTimer.paused = false;
        this.overTimer.paused = false;
        this.eventTimer.timeScale = $gameTime.scale;
        this.overTimer.timeScale = $gameTime.scale;
    }

    getValidPassengers(loco) {
        var index = this.passengers.length - 1;
        var list = [];
        while (index >= 0) {
            var passenger = this.passengers[index];
            if (passenger.isValid(loco)) {
                list.push(passenger);
            }
            index--;
        }
        return list;
    }

    arrival(loco) {
        var passengers = loco.getShapePassengers(this.shape);
        passengers.forEach(function(passenger) {
            passenger.getOff(this);
            loco.removePassenger(passenger);
        });
    }

    depart(loco) {
        var passengers = this.getValidPassengers(loco);
        passengers.forEach(function(passenger) {
            if (!loco.isFull()) {
                passenger.getOn(loco);
                var index = this.passengers.indexOf(passenger);
                this.passengers.splice(index, 1);
            }
        }, this);
        this.refreshPassengers();
    }
}

//-----------------------------------------------------------------------------
// Game_Line

class Game_Line {
    constructor(scene, lineId) {
        this.scene = scene;
        this.routes = [];
        this.temp = [];
        this.lineId = lineId;
        this.start = null;
        this.end = null;
        this.canvas = null;
        this.renderer = null;
        this.loco = null;
        this.create();
    }

    create() {
        this.createCanvas();
        this.createRenderer();
    }

    createCanvas() {
        this.canvas = this.scene.textures.createCanvas(this.textureKey(), 800, 600);
    }

    createRenderer() {
        this.renderer = this.scene.add.renderTexture(0, 0, 800, 600, this.textureKey());
    }

    textureKey() {
        return 'line' + this.lineId;
    }

    setLocoStart(loco) {
        loco.setRoute(this.start);
    }

    startStation() {
        return this.stations()[0];
    }

    endStation() {
        return this.stations()[this.getLength()];
    }

    isCreated() {
        return this.getLength() > 0;
    }

    destroy() {
        this.canvas.destroy();
        this.renderer.destroy();
    }

    stations() {
        var s = [];
        var r = this.start;
        for (var i = 0; i < this.getLength(); i++) {
            r = this.routes[i];
            s.push(r.stationA());
        }
        if (i > 0) {
            s.push(this.routes[i-1].stationB());
        }
        return s;
    }

    canLoop(s) {
        return this.startStation() === s || this.endStation() === s && this.routes.length > 2;
    }

    loop() {
        this.end.setNext(this.start);
    }

    isLoop() {
        return this.startStation() === this.endStation() && this.getLength() > 1;
    }

    canAdd(station) {
        return !this.contains(station) || this.canLoop(station);
    }

    canDelete(s) {
        return this.stations()[0] === s || this.stations()[this.getLength()] === s;
    }

    contains(station) {
        return this.stations().indexOf(station) >= 0;
    }

    addFirst(route) {
        this.insert(route, 0);
    }

    addLast(route) {
        this.insert(route, this.routes.length);
    }

    insert(route, index) {
        if (index === 0) {
            this.start = route;
        }
        if (index === this.routes.length) {
            this.end = route;
        }
        this.routes.splice(index, 0, route);
        this.draw();
    }

    deleteFirst() {
        this.delete(0);
    }

    deleteLast() {
        this.delete(this.routes.length - 1);
    }

    delete(index) {
        var r = this.routes[index];
        r.removeLink();
        var item = null;
        if (index === 0) {
            this.start = this.routes[1];
            item = this.tempRoute(r.stationA(), r);
        }
        if (index === this.routes.length - 1) {
            this.end = this.routes[index -1];
            item = this.tempRoute(r.stationB(), r);
        }
        if (!r.canDelete() || item && this.getLength() > 1) {
            r.isTemp = true;
            this.temp.push(r);
        }
        this.routes.splice(index, 1);
        this.draw();
    }

    getShapes(d, route) {
        var s = [];
        if (this.isLoop()) {
            s = this.stations();
            route = null;
        }
        while (route !== null) {
            if (d > 0) {
                s.push(route.stationB());
                route = route.next;
            } else {
                s.push(route.stationA());
                route = route.previous;
            }
        }
        return s.map(function(e) {
            return e.shape;
        });
    }

    route(s, route) {
        for (var i = 0; i < this.getLength(); i++) {
            var r = this.routes[i];
            if (r.stationA() === s || r.stationB() === s && route !== r) {
                return r;
            }
        }
        return null;
    }

    tempRoute(s, route) {
        for (var i = 0; i < this.temp.length; i++) {
            var r = this.temp[i];
            if (r.stationA() === s || r.stationB() === s && route !== r) {
                return r;
            }
        }
        return null;
    }

    createRoute(station) {
        this.route = new Game_Route(this.scene, this, station);
    }

    updateExtend(route, x, y) {
        route.extend(x, y);
        this.draw(route);
    }

    cancelExtend() {
        this.performEdit();
        this.draw();
    }

    performEdit() {
        this.routes.forEach(function(route, index) {
            var next = this.routes[index + 1];
            if (next) {
                route.setNext(next);
            }
        }, this);
    }

    getColor() {
        return  $dataGame.lines[this.lineId - 1] || '';
    }

    draw(r) {
        this.renderer.clear();
        var ctx = this.canvas.getContext();
        ctx.clearRect(0, 0, 800, 600);
        this.routes.forEach(function(r) {
            r.draw(ctx);
        });
        this.temp.forEach(function(r) {
            r.draw(ctx);
        });
        if (r) {
            r.draw(ctx);
        }
        this.canvas.refresh();
    }

    getLength() {
        return this.routes.length;
    }
}

//-----------------------------------------------------------------------------
// Game_Route

class Game_Route extends Phaser.Curves.Path {
    constructor(scene, line, station) {
        super(station.x, station.y);
        scene.add.existing(this);
        this.scene = scene;
        this.line = line;
        this.stations = [station];
        this.lineA = null;
        this.lineB = null;
        this.startAngle = 0;
        this.endAngle = 0;
        this.next = null;
        this.previous = null;
        this.isTemp = false;
        this.indexA = 0;
        this.indexB = 0;
        this.startOffset = 0;
        this.endOffset = 0;
        this.loco = [];
        this.endPoint = null;
    }

    addLoco(loco) {
        this.loco.push(loco);
    }

    removeLoco(loco) {
        this.loco.splice(this.loco.indexOf(loco), 1);
        if (this.isTemp && this.canDelete()) {
            var i = this.line.temp.indexOf(this);
            this.line.temp.splice(i, 1);
            this.destroy();
            this.line.draw();
        }
    }

    canDelete() {
        return this.loco.length === 0 ;
    }

    reverse(x, y) {
        this.stations.reverse();
        var a = this.startAngle;
        this.startAngle = this.endAngle;
        this.endAngle = a;
        this.startPoint.set(x, y);
    }

    setPrevious(route) {
        this.previous = route;
        route.next = this;
    }

    setNext(route) {
        this.next = route;
        route.previous = this;
    }

    getNext() {
        if (this.next) {
            return this.next;
        }
        return this.line.route(this.stationB(), this);
    }

    getPrevious() {
        if (this.previous) {
            return this.previous;
        }
        return this.line.route(this.stationA(), this);
    }

    removeLink() {
        if (this.getNext()) {
            this.getNext().previous = null;
        }
        if (this.getPrevious()) {
            this.getPrevious().next = null;
        }
    }

    getStation(index) {
        return this.stations[index];
    }

    stationA() {
        return this.getStation(0);
    }

    stationB() {
        return this.getStation(1);
    }

    setDefaultStyle(ctx) {
        ctx.lineWidth = 12;
        ctx.strokeStyle = this.line.getColor().replace('0x', '#');
        ctx.globalAlpha = this.isTemp ? .5 : 1;
    }

    setBridgeStyle(ctx) {
        ctx.globalAlpha = 1;
        ctx.lineWidth = 4;
    }

    draw(ctx) {
        this.setDefaultStyle(ctx);
        ctx.beginPath();
        var s = this.getStartPoint();
        ctx.moveTo(s.x, s.y);
        var isWater = false;
        var pmd = Phaser.Math.Distance;
        var d1 = pmd.BetweenPoints(this.getStartPoint(), this.getEndPoint());
        for (var i = 1; i <= this.getLength(); i += 0.1) {
            var e = this.getPoint(i / this.getLength());
            var d2 = pmd.BetweenPoints(e, this.getEndPoint());
            ctx.lineTo(e.x, e.y);
            if ($gameMap.water.contains(e.x, e.y) && !isWater) {
                this.strokePath(ctx, e);
                this.setBridgeStyle(ctx);
                isWater = true;
            }
            if (!$gameMap.water.contains(e.x, e.y) && isWater) {
                this.strokePath(ctx, e);
                this.setDefaultStyle(ctx);
                isWater = false;
            }
        }
        ctx.stroke();
    }

    strokePath(ctx, e) {
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
    }

    setPath(train) {
        train.setPath(this);
    }

    addStation(station) {
        if (this.stations[0] === null) {
            this.stations[0] = station;
        } else {
            this.stations[1] = station;
        }
        //this.extend(station.x, station.y);
    }

    getStation(t) {
        return this.stations[t];
    }

    setLocoNext(loco) {
        var route = null;
        if (loco.direction > 0) {
            route = this.getNext();
        } else {
            route = this.getPrevious();
        }
        var d = Math.max(0, loco.direction);
        if (route && route.getStation(d) === this.getStation(d)) {
            loco.changeDirection();
        }
        if (route === null) {
            // canRemoveLoco()
            if (this.isTemp && this.line.getLength() === 0 && $gameManager.line !== this.line) {
                $gameMap.removeLoco(loco);
                this.removeLoco(loco);
            } else {
                loco.changeDirection();
            }
        } else {
            loco.setRoute(route);
        }
    }

    canAdd(station) {
        return this.stations.indexOf(station) < 0;
    }

    extend(x, y) {
        var s = this.stations[0];
        this.pathTo(s.x, s.y, x, y);
    }

    pathTo(x1, y1, x2, y2) {
        this.clear();
        this.setupAngle(x1, y1, x2, y2);
        var m = this.midPointTo(x1, y1, x2, y2);
        var m1 = this.midPoint1(m.x, m.y, x1, y1);
        var m2 = this.midPoint2(m.x, m.y, x2, y2);
        var pgi = Phaser.Geom.Intersects;
        var s = new Phaser.Math.Vector2(x2, y2);
        var e = new Phaser.Math.Vector2(x1, y1);
        if ((x1 === x2 || y1 === y2) || Math.abs((y2 - y1) / (x2 - x1)) === 1) {
            this.lineTo(x2, y2);
        } else if (!pgi.PointToLine(s, this.lineA, 24)) {
            this.standardPathTo(this.lineA.x1, this.lineA.y1, this.lineB.x1, this.lineB.y1, m, m1, m2);
        } else {
            if (m1) {
                this.lineTo(m1.x, m1.y);
            }
            this.cubicBezierTo(x2, y2, m.x, m.y, m.x, m.y);
        }
    }

    isParallelIntersect(line) {
        return this.isLineIntersect(line, this.lineA) || this.isLineIntersect(line, this.lineB);
    }

    isLineIntersect(l1, l2) {
        var pgl = Phaser.Geom.Line;
        var pgi = Phaser.Geom.Intersects;
        for (var i = 9; i < pgl.Length(l2) - 9; i++) {
            var p = l2.getPoint(i / pgl.Length(l2));
            if (pgi.PointToLine(p, l1) && Math.abs(pgl.Slope(l1)) === Math.abs(pgl.Slope(l2))) {
                return true;
            }
        }
        return false;

    }

    standardPathTo(x1, y1, x2, y2, m, m1, m2) {
        // temp fix
        if (m1) {
            this.lineTo(m1.x, m1.y);
        }
        this.cubicBezierTo(m2.x, m2.y, m.x, m.y, m.x, m.y);
        this.lineTo(x2, y2);
    }

    clear() {
        this.curves = [];
        this.cacheLengths = [];
    }

    setupAngle(x1, y1, x2, y2) {
        var angle1 = this.roundedAngle(x1, y1, x2, y2);
        var angle2 = this.roundedAngle(x2, y2, x1, y1);
        var pma = Phaser.Math.Angle;
        if (pma.Wrap(pma.ShortestBetween(this.startAngle, angle1)) > 0) {
            angle1 -= Math.PI / 4;
        } else {
            angle2 -= Math.PI / 4;
        }
        this.startAngle = angle1;
        this.endAngle = angle2;
    }

    midPointTo(x1, y1, x2, y2) {
        var max = Number.MAX_SAFE_INTEGER;
        this.lineA = new Phaser.Geom.Line();
        this.lineB = new Phaser.Geom.Line();
        var a = Phaser.Geom.Line.SetToAngle(this.lineA, x1, y1, this.startAngle, max);
        var b = Phaser.Geom.Line.SetToAngle(this.lineB, x2, y2, this.endAngle, max);
        var out = new Phaser.Geom.Point();
        Phaser.Geom.Intersects.LineToLine(a, b, out);
        
        this.lineA.setTo(x1, y1, out.x, out.y);
        //this.calcOffsetA(x1, y1);

        this.lineB.setTo(x2, y2, out.x, out.y);
        //this.calcOffsetB(x2, y2);

        this.setupAngle(x1, y1, x2, y2);
        return out;
    }

    midPoint1(x, y, x1, y1) {
        var circle = new Phaser.Geom.Circle(x, y, 20);
        var out = [];
        Phaser.Geom.Intersects.GetLineToCircle(this.lineA, circle, out);
        return out.shift();
    }

    midPoint2(x, y, x2, y2) {
        var circle = new Phaser.Geom.Circle(x, y, 20);
        var out = [];
        Phaser.Geom.Intersects.GetLineToCircle(this.lineB, circle, out);
        return out.shift();
    }

    roundedAngle(x1, y1, x2, y2) {
        var angle = Math.abs(Phaser.Math.Angle.Between(x1, y1, x2, y2));
        var res = angle;
        if (0 <= angle && angle <= Math.PI / 4) {
            res = Math.PI / 4;
        }
        if (Math.PI / 4 <= angle && angle <= Math.PI / 2) {
            res = Math.PI / 2;
        }
        if (Math.PI / 2 <= angle && angle <= Math.PI * 3 / 4) {
            res = Math.PI * 3 / 4;
        }
        if (Math.PI * 3 / 4 <= angle && angle <= Math.PI) {
            res = Math.PI;
        }
        if (Phaser.Math.Angle.Between(x1, y1, x2, y2) < 0) {
            res = -res + Math.PI / 4;
        }
        return res;
    }

    isIntersectWater() {
        for (var i = 0; i < this.getPoints().length; i++) {
            var point = this.getPoints()[i];
            if ($gameMap.water.contains(point.x, point.y)) {
                return true;
            }
        }
        return false;
    }
}

