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

var DINOSCALE = 22;  // How big our dino is scaled to

var dino;
var loader = new THREE.JSONLoader();

var instructions = document.getElementById('instructions');

getPointerLock();
init();

//------------------------------------//
//  Fonctions pour bloquer la souris  //
//------------------------------------//

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

//--------------------------//
//  INITIALISATION DU JEU   //
//--------------------------//

// On crée la scene, le moteur de rendu et la caméra en lui donnant les controle de la souris
// Puis on génère les mur, le sol, le périmètre et les lumières
// Et finalement on se met à écouter les mouvements du joueurs


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

//----------------------//
//  CHARGEMENT DU DINO  //
//----------------------//

// Asynchronement (donc bloquant), on charge le dino et on le crée dans le monde
// A la fin du chargement, on lance animate(),fonctions qui va faire le rendu du jeu

// load the dino JSON model and start animating once complete
 loader.load('./models/dino.json', function (geometry, materials) {


     // Get the geometry and materials from the JSON
     var dinoObject = new THREE.Mesh(geometry, new THREE.MultiMaterial(materials));

     // Scale the size of the dino
     dinoObject.scale.set(DINOSCALE, DINOSCALE, DINOSCALE);
     dinoObject.rotation.y = degreesToRadians(-90);
     dinoObject.position.set(30, 0, -400);
     dinoObject.name = "dino";
     scene.add(dinoObject);

     // Store the dino
     dino = scene.getObjectByName("dino");

     // Model is loaded, switch from "Loading..." to instruction text
     instructions.innerHTML = "<strong>Click to Play!</strong> </br></br> W,A,S,D or arrow keys = move </br>Mouse = look around";

     // Call the animate function so that animation begins after the model is loaded
     animate();
 });

 //----------------------//
 //  ANIMATE ET RENDER   //
 //----------------------//

 // Deux méthodes créant les rendu et faisant avancer le joueur très régulièrement via la méthode requestAnimationFrame;

 function animate() {
   render();
   // Get the change in time between frames
   var delta = clock.getDelta();
   animatePlayer(delta);
   // Keep updating the renderer
   requestAnimationFrame(animate);
 }

 function render() {
   renderer.render(scene, camera);
 }

//--------------------------------------//
//  Fonctions de création des elements  //
//--------------------------------------//


//Fonctions pour créer les cubes dans la scene, se basant sur une map aléatoire de 1 et de 0
//On force en plus un espace vide au milieu pour que le joueur ne se restrouve pas bloqué
//TODO : Faire que le joueur apparaise a un endroit aléatoire et que cet endroit soit sans blocs.

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


//Générateur de map aléatoire via une constante définissant le nombre de bloc de longueur

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


//Fonction pour créer le sol

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


//Fonction pour créer les murs de périmètre en 2 étapes

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


//Fonctions pour ajouter des lumières

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


//Fonctions pour écouter le mouvement du joueur, settant des variable a true ou false

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


// Fonctions pour animer le joueur se basant sur un delta de temps pour ne pas etre embeté par les framerate bas

function animatePlayer(delta) {
  // Gradual slowdown
  playerVelocity.x -= playerVelocity.x * 8 * delta;
  playerVelocity.z -= playerVelocity.z * 8 * delta;

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




//---------------------------------------------//
//  Fonctions autres, petites fonctionnalites  //
//---------------------------------------------//


//Permet de toujours avoir une scene a la bonne taille
function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}


//Conversion de degré en radiant

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function radiansToDegrees(radians) {
  return radians * 180 / Math.PI;
}


////// TODO ////////
// Déplacement du dino
// Colision du joueur avec les blocs et les mur
// Colisions du dino et animation du dino
// Implementer la chasse
// Fin du jeu
// Page de parametre/difficulté
