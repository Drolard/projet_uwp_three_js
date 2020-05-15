var UNITWIDTH = 90; // Width of a cubes in the maze
var UNITHEIGHT = 45; // Height of the cubes in the maze

var camera, scene, renderer, collidableObjects;
var totalCubesWide = 20; // How many cubes wide the maze will be
var controls;
var controlsEnabled = false;

// HTML elements to be changed
var blocker = document.getElementById('blocker');

// Flags to determine which direction the player is moving
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;

// Velocity vector for the player
var playerVelocity = new THREE.Vector3();

// How fast the player will move
var PLAYERSPEED = 800.0;

var clock;


getPointerLock();
init();
animate();

//----------------------//
//  Fonctions pour bloquer la souris  //
//----------------------//

function getPointerLock() {
  document.onclick = function () {
    container.requestPointerLock();
  }
  document.addEventListener('pointerlockchange', lockChange, false);
}

function lockChange() {
  // Turn on controls
  if (document.pointerLockElement === container) {
    // Hide blocker and instructions
    blocker.style.display = "none";
    controls.enabled = true;
    // Turn off the controls
  } else {
    // Display the blocker and instruction
    blocker.style.display = "";
    controls.enabled = false;
  }
}

//----------------------//
//  Fonctions d'affichages  //
//----------------------//


function init() {
  // ON créer une scene - Endroit ou tout va se créer
  scene = new THREE.Scene();

  // On ajoute de la fumée
  scene.fog = new THREE.FogExp2(0x5E52FF, 0.0015);

  // Set render settings
  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(scene.fog.color);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Get the HTML container and connect renderer to it
  var container = document.getElementById('container');
  container.appendChild(renderer.domElement);

  // Set camera position and view details
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.y = 20; // Height the camera will be looking from
  camera.position.x = 0;
  camera.position.z = 0;

  // Add the camera
  scene.add(camera);

  controls = new THREE.PointerLockControls(camera);
  scene.add(controls.getObject());

  // On ajoute les mur générés aléatoirement, le solet les mur de perimetre
  collidableObjects = [];
  createMazeCubes();
  createGround();
  createPerimWalls();
  // Add lights to the scene
  addLights();

  // Listen for if the window changes sizes and adjust
  window.addEventListener('resize', onWindowResize, false);

  clock = new THREE.Clock();
  listenForPlayerMovement();
}

function animate() {
  render();
  // Keep updating the renderer
  requestAnimationFrame(animate);
  // Get the change in time between frames
  var delta = clock.getDelta();
  animatePlayer(delta);
}

function render() {
  renderer.render(scene, camera);
}

//----------------------//
//  Fonctions de création des elements  //
//----------------------//

function createMazeCubes() {
  // Maze wall mapping, assuming even square
  // 1's are cubes, 0's are empty space
  var map = generateRandomMap();
  console.log(map);

  // wall details
  var cubeGeo = new THREE.BoxGeometry(UNITWIDTH, UNITHEIGHT, UNITWIDTH);
  var cubeMat = new THREE.MeshPhongMaterial({
    color: 0x098D62,
  });

  // Keep cubes within boundry walls
  var widthOffset = UNITWIDTH / 2;
  // Put the bottom of the cube at y = 0
  var heightOffset = UNITHEIGHT / 2;

  //On fait une zone de 2x2 au centre si width pair, 3x3 si impair
  if(totalCubesWide%2){
    let mid = totalCubesWide/2;
    map[mid][mid] = 0;
    map[mid+1][mid] = 0;
    map[mid][mid+1] = 0;
    map[mid+1][mid+1] = 0;
  } else {
    let mid = totalCubesWide/2;
    map[mid-1][mid-1] = 0;
    map[mid-1][mid] = 0;
    map[mid-1][mid+1] = 0;

    map[mid][mid-1] = 0;
    map[mid][mid] = 0;
    map[mid][mid+1] = 0;

    map[mid+1][mid-1] = 0;
    map[mid+1][mid] = 0;
    map[mid+1][mid+1] = 0;
  }

  // Place walls where 1`s are
  for (let i = 0; i < totalCubesWide; i++) {
    for (let j = 0; j < map[i].length; j++) {
      // If a 1 is found, add a cube at the corresponding position
      if (map[i][j]){
        // Make the cube
        var cube = new THREE.Mesh(cubeGeo, cubeMat);
        // Set the cube position
        cube.position.z = (i - totalCubesWide / 2) * UNITWIDTH + widthOffset;
        cube.position.y = heightOffset;
        cube.position.x = (j - totalCubesWide / 2) * UNITWIDTH + widthOffset;
        // Add the cube
        scene.add(cube);
        // Used later for collision detection
        collidableObjects.push(cube);
      }
    }
  }

  // The size of the maze will be how many cubes wide the array is * the width of a cube
  mapSize = totalCubesWide * UNITWIDTH;
}

function generateRandomMap(){
  var map_temp = [];
  var ligne_temp, rand;
  for (let i = 0; i < totalCubesWide; i++) {
    ligne_temp = []
    for (let j = 0; j < totalCubesWide; j++) {
      rand = Math.random()*10;
      ligne_temp.push((rand >= 8)?1:0)
    }
    map_temp.push(ligne_temp);
  }
  return map_temp;
}


var mapSize;    // The width/depth of the maze

function createGround() {
  // Create ground geometry and material
  var groundGeo = new THREE.PlaneGeometry(mapSize, mapSize);
  var groundMat = new THREE.MeshPhongMaterial({ color: 0x424530, side: THREE.DoubleSide});

  var ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, 1, 0);
  // Rotate the place to ground level
  ground.rotation.x = degreesToRadians(90);
  scene.add(ground);
}

function createPerimWalls() {
  var halfMap = mapSize / 2;  // Half the size of the map
  var sign = 1;               // Used to make an amount positive or negative

  // Loop through twice, making two perimeter walls at a time
  for (let i = 0; i < 2; i++) {
    var perimGeo = new THREE.PlaneGeometry(mapSize, UNITHEIGHT*5);
    // Make the material double sided
    var perimMat = new THREE.MeshPhongMaterial({ color: 0x464646, side: THREE.DoubleSide });
    // Make two walls
    var perimWallLR = new THREE.Mesh(perimGeo, perimMat);
    var perimWallFB = new THREE.Mesh(perimGeo, perimMat);

    // Create left/right wall
    perimWallLR.position.set(halfMap * sign, UNITHEIGHT / 2, 0);
    perimWallLR.rotation.y = degreesToRadians(90);
    scene.add(perimWallLR);
    // Used later for collision detection
    collidableObjects.push(perimWallLR);
    // Create front/back wall
    perimWallFB.position.set(0, UNITHEIGHT / 2, halfMap * sign);
    scene.add(perimWallFB);

    // Used later for collision detection
    collidableObjects.push(perimWallFB);

    sign = -1; // Swap to negative value
  }
}

function addLights() {
  var lightOne = new THREE.DirectionalLight(0xffffff);
  lightOne.position.set(1, 1, 1);
  scene.add(lightOne);

  // Add a second light with half the intensity
  var lightTwo = new THREE.DirectionalLight(0xffffff, .5);
  lightTwo.position.set(1, -1, -1);
  scene.add(lightTwo);
}


//----------------------//
//  Fonctions joueurs  //
//----------------------//

function listenForPlayerMovement() {

  // A key has been pressed
  var onKeyDown = function(event) {

    switch (event.keyCode) {

      case 38: // up
      case 90: // w
      moveForward = true;
      break;

      case 37: // left
      case 81: // a
      moveLeft = true;
      break;

      case 40: // down
      case 83: // s
      moveBackward = true;
      break;

      case 39: // right
      case 68: // d
      moveRight = true;
      break;
    }
  };

  // A key has been released
  var onKeyUp = function(event) {

    switch (event.keyCode) {

      case 38: // up
      case 90: // w
      moveForward = false;
      break;

      case 37: // left
      case 81: // a
      moveLeft = false;
      break;

      case 40: // down
      case 83: // s
      moveBackward = false;
      break;

      case 39: // right
      case 68: // d
      moveRight = false;
      break;
    }
  };

  // Add event listeners for when movement keys are pressed and released
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
}

function animatePlayer(delta) {
  // Gradual slowdown
  playerVelocity.x -= playerVelocity.x * 10.0 * delta;
  playerVelocity.z -= playerVelocity.z * 10.0 * delta;

  if (moveForward) {
    playerVelocity.z -= PLAYERSPEED * delta;
  }
  if (moveBackward) {
    playerVelocity.z += PLAYERSPEED * delta;
  }
  if (moveLeft) {
    playerVelocity.x -= PLAYERSPEED * delta;
  }
  if (moveRight) {
    playerVelocity.x += PLAYERSPEED * delta;
  }
  if( !( moveForward || moveBackward || moveLeft ||moveRight)) {
    // No movement key being pressed. Stop movememnt
    playerVelocity.x = 0;
    playerVelocity.z = 0;
  }
  controls.getObject().translateX(playerVelocity.x * delta);
  controls.getObject().translateZ(playerVelocity.z * delta);
}

//----------------------//
//  Fonctions autres, petites fonctionnalites  //
//----------------------//

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function radiansToDegrees(radians) {
  return radians * 180 / Math.PI;
}
