/**
 * Pressure Advance Calibration Pattern
 * Copyright (C) 2019 Sineos [https://github.com/Sineos]
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
'use strict';

// Settings version of localStorage
// Increase if default settings are changed / amended

const PA_round = -4; // Was previously -3
const Z_round = -3;
const XY_round = -4;
const EXT_round = -5; // Was previously -4

function genGcode() {

  // get the values from the HTML elements
  var PRINTER = $('#PRINTER').val(),
      FILAMENT = $('#FILAMENT').val(),
      FILENAME = $('#FILENAME').val(),
      FILAMENT_DIAMETER = parseFloat($('#FIL_DIA').val()),
      NOZZLE_DIAMETER = parseFloat($('#NOZ_DIA').val()),
      LINE_RATIO = parseFloat($('#LINE_RATIO').val()),
      START_GCODE = $('#START_GCODE').val(),
      END_GCODE = $('#END_GCODE').val(),
      SPEED_FIRSTLAYER = parseInt($('#FIRSTLAYER_SPEED').val()),
      SPEED_FILL = parseInt($('#FILL_SPEED').val()),
      SPEED_PERIMETER = parseInt($('#PERIMETER_SPEED').val()),
      SPEED_MOVE = parseInt($('#MOVE_SPEED').val()),
      SPEED_RETRACT = parseInt($('#RETRACT_SPEED').val()),
      SPEED_UNRETRACT = parseInt($('#UNRETRACT_SPEED').val()),
      ACCELERATION = parseInt($('#PRINT_ACCL').val()),
      A2D = ACCELERATION / 2,
      RETRACT_DIST = parseFloat($('#RETRACTION').val()),
      BED_SHAPE = $('#SHAPE_BED').val(),
      BED_X = parseInt($('#BEDSIZE_X').val()),
      BED_Y = parseInt($('#BEDSIZE_Y').val()),
      NULL_CENTER = $('#CENTER_NULL').prop('checked'),
      HEIGHT_FIRSTLAYER = parseFloat($('#LAYER_HEIGHT_FIRSTLAYER').val()),
      HEIGHT_LAYER = parseFloat($('#LAYER_HEIGHT').val()),
      HEIGHT_PRINT = parseFloat($('#PRINT_HEIGHT').val()),
      EXTRUDER_NAME = $('#EXTRUDER_NAME').val(),
      FAN_SPEED_FIRSTLAYER = parseFloat($('#FAN_SPEED_FIRSTLAYER').val()),
      FAN_SPEED = parseFloat($('#FAN_SPEED').val()),
      EXT_MULT = parseFloat($('#EXTRUSION_MULT').val()),
      PA_START = parseFloat($('#PA_START').val()),
      PA_END = parseFloat($('#PA_END').val()),
      PA_STEP = parseFloat($('#PA_STEP').val()),
      PRINT_DIR = $('#DIR_PRINT').val(),
      PATTERN_SPACING = parseInt($('#PATTERN_SPACING').val()),
      PATTERN_ANGLE = parseInt($('#PATTERN_ANGLE').val()),
      PERIMETERS = parseInt($('#PERIMETERS').val()),
      USE_PRIME = $('#PRIME').prop('checked'),
      USE_MMS = $('#MM_S').prop('checked'),
      USE_FWR = $('#USE_FWR').prop('checked'),
      EXT_MULT_PRIME = parseFloat($('#PRIME_EXT').val()),
      SPEED_PRIME = parseInt($('#PRIME_SPEED').val()),
      PATTERN_SIDE_LENGTH = parseInt($('#PATTERN_SIDE_LENGTH').val()),
      USE_LINENO = $('#LINE_NO').prop('checked');

  if (BED_SHAPE === 'Round') {
    BED_Y = BED_X;
  }

  if (USE_MMS) {
    SPEED_FIRSTLAYER *= 60;
    SPEED_FILL *= 60;
    SPEED_PERIMETER *= 60;
    SPEED_MOVE *= 60;
    SPEED_PRIME *= 60;
    SPEED_RETRACT *= 60;
    SPEED_UNRETRACT *= 60;
  }

  var RANGE_PA = PA_END - PA_START,
      NUM_PATTERNS = RANGE_PA / PA_STEP + 1,
      NUM_LAYERS = Math.round((HEIGHT_PRINT - HEIGHT_FIRSTLAYER) / HEIGHT_LAYER + 1),

      LINE_WIDTH = NOZZLE_DIAMETER * LINE_RATIO,
      EXTRUSION_RATIO = LINE_WIDTH * HEIGHT_LAYER / (Math.pow(FILAMENT_DIAMETER / 2, 2) * Math.PI),

      // slic3r line spacing: spacing = extrusion_width - layer_height * (1 - PI/4)
      LINE_SPACING = LINE_WIDTH - HEIGHT_LAYER * (1 - Math.PI / 4),
      PATTERN_ANGLE_RAD = PATTERN_ANGLE * Math.PI / 180,
      LINE_SPACING_ANGLE = LINE_SPACING / Math.sin(PATTERN_ANGLE_RAD/2),

      //PRINT_SIZE_X = (PATTERN_SPACING * (NUM_PATTERNS - 1)) + Math.sqrt((Math.pow(PATTERN_SIDE_LENGTH, 2) / 2)),
      PRINT_SIZE_X = (NUM_PATTERNS * ((PERIMETERS - 1) * LINE_SPACING_ANGLE)) + ((NUM_PATTERNS - 1) *  PATTERN_SPACING) + Math.sqrt((Math.pow(PATTERN_SIDE_LENGTH, 2) / 2)),
      PRINT_SIZE_X = Math.round10(PRINT_SIZE_X, XY_round), // round it
      FIT_WIDTH = PRINT_SIZE_X + LINE_WIDTH, // Just adds the round ends. Half-circle on each side (so = whole circle)... which is diameter of LINE_WIDTH

      //PRINT_SIZE_Y = Math.sqrt(Math.pow(PATTERN_SIDE_LENGTH, 2) * 2),
      PRINT_SIZE_Y = 2 * (Math.sin(PATTERN_ANGLE_RAD/2) * PATTERN_SIDE_LENGTH),
      PRINT_SIZE_Y = Math.round10(PRINT_SIZE_Y, XY_round), // round it
      FIT_HEIGHT = PRINT_SIZE_Y + LINE_WIDTH, // Just adds the round ends. Half-circle on each side (so = whole circle)... which is diameter of LINE_WIDTH

      CENTER_X = (NULL_CENTER ? 0 : BED_X / 2),
      CENTER_Y = (NULL_CENTER ? 0 : BED_Y / 2),

      PAT_START_X = CENTER_X - (PRINT_SIZE_X / 2),
      PAT_START_Y = CENTER_Y - (PRINT_SIZE_Y / 2),

      printDirRad = PRINT_DIR * Math.PI / 180,
      FIT_WIDTH = Math.abs(PRINT_SIZE_X * Math.cos(printDirRad)) + Math.abs(PRINT_SIZE_Y * Math.sin(printDirRad)),
      FIT_HEIGHT = Math.abs(PRINT_SIZE_X * Math.sin(printDirRad)) + Math.abs(PRINT_SIZE_Y * Math.cos(printDirRad)),

      txtArea = document.getElementById('gcodetextarea');

  var basicSettings = {
    'slow': SPEED_FIRSTLAYER,
    'fast': SPEED_PERIMETER,
    'move': SPEED_MOVE,
    'centerX': CENTER_X,
    'centerY': CENTER_Y,
    'printDir': PRINT_DIR,
    'lineWidth': LINE_WIDTH,
    'extRatio': EXTRUSION_RATIO,
    'extMult': EXT_MULT,
    'extMultPrime': EXT_MULT_PRIME,
    'retractDist': RETRACT_DIST,
    'retractSpeed' : SPEED_RETRACT,
    'unretractSpeed' : SPEED_UNRETRACT,
    'fwRetract' : USE_FWR,
    'extruderName' : EXTRUDER_NAME
  };

  var patSettings = {
    'sideLength': PATTERN_SIDE_LENGTH,
    'paStart' : PA_START,
    'paEnd' : PA_END,
    'paStep' : PA_STEP,
    'lineSpacing' : PATTERN_SPACING,
    'patternAngle' : PATTERN_ANGLE,
    'perimeters' : PERIMETERS
  };

  // Start G-code for pattern
  var pa_script =  '; ### Klipper Pressure Advance Calibration Pattern ###\n' +
                  '; -------------------------------------------\n' +
                  ';\n' +
                  '; Created: ' + new Date() + '\n' +
                  ( PRINTER ? '; Printer Name: ' + PRINTER + '\n' : '') + 
                  ( FILAMENT ? '; Filament Name: ' + FILAMENT + '\n' : '') + 
                  ';\n' +
                  '; Printer:\n' +
                  '; Nozzle Diameter = ' + NOZZLE_DIAMETER + ' mm\n' +
                  '; Filament Diameter = ' + FILAMENT_DIAMETER + ' mm\n' +
                  '; Extrusion Multiplier = ' + EXT_MULT + '\n' +
                  '; Extruder Name = ' + EXTRUDER_NAME + ' \n' +
                  '; Start G-code = ' + START_GCODE.replace(/^/gm, '; ')+ '\n' +
                  '; End G-code = ' + END_GCODE.replace(/^/gm, '; ')+ '\n' +
                  ';\n' +
                  '; Bed:\n' +
                  '; Bed Shape = ' + BED_SHAPE + '\n' +
                  (BED_SHAPE === 'Round' ? '; Bed Diameter = ' + BED_X + ' mm\n' : '; Bed Size X = ' + BED_X + ' mm\n') +
                  (BED_SHAPE === 'Round' ? '' : '; Bed Size Y = ' + BED_Y + ' mm\n') +
                  '; Origin Bed Center = ' + (NULL_CENTER ? 'true' : 'false') + '\n' +
                  ';\n' +
                  '; Retraction:\n' +
                  '; Use FWRETRACT = ' + (USE_FWR ? 'true' : 'false') + '\n' +
                  '; Retraction Distance = ' + RETRACT_DIST + ' mm\n' +
                  '; Retract Speed = ' + (USE_MMS ? SPEED_RETRACT / 60 + "mm/s" : SPEED_RETRACT + ' mm/min') + '\n' +
                  '; Unretract Speed = ' + (USE_MMS ? SPEED_UNRETRACT / 60 + "mm/s" : SPEED_UNRETRACT + ' mm/min') + '\n' +
                  ';\n' +
                  '; First Layer:\n' +
                  '; First Layer Height = ' + HEIGHT_FIRSTLAYER + ' mm\n' +
                  '; First Layer Printing Speed = ' + (USE_MMS ? SPEED_FIRSTLAYER / 60 + "mm/s" : SPEED_FIRSTLAYER + ' mm/min') + '\n' +
                  '; First Layer Fan Speed = ' + FAN_SPEED_FIRSTLAYER + ' %\n' +
                  ';\n' +
                  '; Print Settings:\n' +
                  '; Layer Height = ' + HEIGHT_LAYER + ' mm\n' +


                  '; Total Print Height = ' + HEIGHT_PRINT + ' mm\n' +
                  
                  
                  '; Fan Speed = ' + FAN_SPEED + ' %\n' +
                  //';\n' +
                  //'; Settings Print Bed:\n' +

                  ';\n' +
                  '; Speeds:\n' +
                  '; Use mm/s = ' + USE_MMS + '\n' +
                  
                  '; Perimeter Printing Speed = ' + (USE_MMS ? SPEED_PERIMETER / 60 + "mm/s" : SPEED_PERIMETER + ' mm/min') + '\n' +
                  '; Movement Speed = ' + (USE_MMS ? SPEED_MOVE / 60 + "mm/s" : SPEED_MOVE + ' mm/min') + '\n' +
                  
                  
                  '; Printing Acceleration = ' + ACCELERATION + ' mm/s^2\n' +
                  ';\n' +
                  '; Pattern Settings:\n' +
                  '; Starting Value Factor = ' + PA_START + '\n' +
                  '; Ending Value Factor = ' + PA_END + '\n' +
                  '; Factor Stepping = ' + PA_STEP + '\n' +
                  '; Pattern Spacing = ' + PATTERN_SPACING + ' mm\n' +
                  '; Pattern Angle = ' + PATTERN_ANGLE + 'degrees \n' +
                  '; Perimeters = ' + PERIMETERS + ' mm\n' +
                  '; Side Length = ' + PATTERN_SIDE_LENGTH + ' mm\n' +
                  //'; Number Lines = ' + (USE_LINENO ? 'true' : 'false') + '\n' +
                  '; Number of Patterns to Print = ' + NUM_PATTERNS + '\n' +
                  ';\n' +
                  '; Dimensions:\n' +

                  '; Print Size X = ' + FIT_WIDTH + ' mm\n' +
                  '; Print Size Y = ' + FIT_HEIGHT + ' mm\n' +
                  '; Print Rotation = ' + PRINT_DIR + ' degree\n' +
                  //';\n' +
                  //'; Settings Advance:\n' +
                  '; Line Width Ratio = ' + LINE_RATIO + '\n' +
                  
                  
                  //'; Prime Nozzle = ' + (USE_PRIME ? 'true' : 'false') + '\n' +
                  //'; Prime Extrusion Multiplier = ' + EXT_MULT_PRIME + '\n' +
                  //'; Prime Speed = ' + SPEED_PRIME + '\n' +
                  ';\n' +
                  '; prepare printing\n' +
                  ';\n' +
                  'ACTIVATE_EXTRUDER EXTRUDER=' + EXTRUDER_NAME + '\n' +
                  START_GCODE + '\n' +
                  'G21 ; Millimeter units\n' +
                  'G90 ; Absolute XYZ\n' +
                  'M83 ; Relative E\n' +
                  'SET_VELOCITY_LIMIT ACCEL=' + ACCELERATION + ' ACCEL_TO_DECEL=' + A2D + ' ; Acceleration\n' +
                  'G92 E0 ; Reset extruder distance\n' +
                  'M106 S' + Math.round(FAN_SPEED_FIRSTLAYER * 2.55) + '\n';

  var TO_X = PAT_START_X,
      TO_Y = PAT_START_Y,
      TO_Z = HEIGHT_FIRSTLAYER;

  //Move to layer height then start position
  pa_script += doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD')) + //retract
              'G1 Z' + TO_Z + ' F' + SPEED_MOVE + ' ; Move to layer height\n' +
               moveTo(PAT_START_X, PAT_START_Y, basicSettings);

  for (let i = 0; i < NUM_LAYERS ; i++){
    for (let j = 0; j < NUM_PATTERNS; j++){
      pa_script += 'SET_PRESSURE_ADVANCE ADVANCE=' + (PA_START + (j * PA_STEP)) + ' EXTRUDER=' + EXTRUDER_NAME + ' ; Set Pressure Advance\n' + 
                   'M106 S' + (i == 0 ? FAN_SPEED_FIRSTLAYER * 2.55 : FAN_SPEED * 2.55) + '\n';
      for (let k = 0; k < PERIMETERS ; k++){
        TO_X += (Math.cos(PATTERN_ANGLE_RAD / 2) * PATTERN_SIDE_LENGTH);
        TO_Y += (Math.sin(PATTERN_ANGLE_RAD / 2) * PATTERN_SIDE_LENGTH);

        pa_script += doEfeed('+', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +  //unretract
                     createLine(TO_X, TO_Y, PATTERN_SIDE_LENGTH, basicSettings, {'extRatio': EXTRUSION_RATIO, 'speed': (i == 0 ? SPEED_FIRSTLAYER : SPEED_PERIMETER)});

        TO_X -= Math.cos(PATTERN_ANGLE_RAD / 2) * PATTERN_SIDE_LENGTH;
        TO_Y += Math.sin(PATTERN_ANGLE_RAD / 2) * PATTERN_SIDE_LENGTH;

        pa_script += createLine(TO_X, TO_Y, PATTERN_SIDE_LENGTH, basicSettings, {'extRatio': EXTRUSION_RATIO, 'speed': (i == 0 ? SPEED_FIRSTLAYER : SPEED_PERIMETER)}) +
                     doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD')); //retract

        if (k != PERIMETERS - 1){
          TO_X += LINE_SPACING_ANGLE;
        } else {
          TO_X += PATTERN_SPACING;
        }
        TO_Y = PAT_START_Y;
        pa_script += moveTo(TO_X, TO_Y, basicSettings);
      }
    }

    TO_X = PAT_START_X;
    TO_Y = PAT_START_Y;
    TO_Z += HEIGHT_LAYER;

    pa_script += 'G1 Z' + TO_Z + ' F' + SPEED_MOVE + ' ; Move to layer height\n' + 
                  moveTo(TO_X, TO_Y, basicSettings);
  }

/*
  // Prime nozzle if activated
  if (USE_PRIME) {
    var primeStartX = CENTER_X - LENGTH_SLOW - (0.5 * PATTERN_SIDE_LENGTH) - (USE_LINENO ? 4 : 0) - 5,
        primeStartY = CENTER_Y - (PRINT_SIZE_Y / 2);

    pa_script += ';\n' +
                '; prime nozzle\n' +
                ';\n' +
                moveTo(primeStartX, primeStartY, basicSettings) +
                createLine(primeStartX, primeStartY + PRINT_SIZE_Y, PRINT_SIZE_Y, basicSettings, {'extMult': EXT_MULT_PRIME, 'speed': SPEED_PRIME}) +
                moveTo(primeStartX + (LINE_WIDTH * 1.5), primeStartY + PRINT_SIZE_Y, basicSettings) +
                createLine(primeStartX + (LINE_WIDTH * 1.5), primeStartY, -PRINT_SIZE_Y, basicSettings, {'extMult': EXT_MULT_PRIME, 'speed': SPEED_PRIME}) +
                doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD'));
  }

  // if selected, print an anchor frame around test line start and end points
  if (USE_FRAME) {
    var frameStartX1 = PAT_START_X,
        frameStartX2 = PAT_START_X + (2 * LENGTH_SLOW) + PATTERN_SIDE_LENGTH,
        frameStartY = PAT_START_Y - 3,
        frameLength = PRINT_SIZE_Y - 19;

    pa_script += ';\n' +
                '; print anchor frame\n' +
                (USE_PRIME ? doEfeed('+', basicSettings, (USE_FWR ? 'FWR' : 'STD')) : '') +
                moveTo(frameStartX1, frameStartY, basicSettings) +
                createLine(frameStartX1, frameStartY + frameLength, frameLength, basicSettings, {'extMult': EXT_MULT * 1.1}) +
                moveTo(frameStartX1 + LINE_WIDTH, frameStartY + frameLength, basicSettings) +
                createLine(frameStartX1 + LINE_WIDTH, frameStartY, -frameLength, basicSettings, {'extMult': EXT_MULT * 1.1}) +
                doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +
                moveTo(frameStartX2, frameStartY, basicSettings) +
                doEfeed('+', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +
                createLine(frameStartX2, frameStartY + frameLength, frameLength, basicSettings, {'extMult': EXT_MULT * 1.1}) +
                moveTo(frameStartX2 - LINE_WIDTH, frameStartY + frameLength, basicSettings) +
                createLine(frameStartX2 - LINE_WIDTH, frameStartY, -frameLength, basicSettings, {'extMult': EXT_MULT * 1.1}) +
                doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD'));
  }

  // insert a retract if no prime and no frame
  if (!USE_PRIME && !USE_FRAME)
    pa_script += doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD'));

  // generate the pressure advance Test pattern
  pa_script += ';\n' +
              '; start the Test pattern\n' +
              ';\n' +
              (PRIME_DWELL ? 'G4 P' + (PRIME_DWELL * 1000) + ' ; Pause (dwell) for 2 seconds\n' : '') +
              moveTo(PAT_START_X, PAT_START_Y, basicSettings);



  if (PATTERN_TYPE === 'std')
    pa_script += createStdPattern(PAT_START_X, PAT_START_Y, basicSettings, patSettings);
  else if (PATTERN_TYPE === 'alt')
    pa_script += createAltPattern(PAT_START_X, PAT_START_Y, basicSettings, patSettings);

  // mark area of speed changes
  var refStartX1 = CENTER_X - (0.5 * PATTERN_SIDE_LENGTH) + (USE_PRIME ? 5 : 0) - (USE_LINENO ? 4 : 0),
      refStartX2 = CENTER_X + (0.5 * PATTERN_SIDE_LENGTH) + (USE_PRIME ? 5 : 0) - (USE_LINENO ? 4 : 0),
      refStartY = CENTER_Y + (PRINT_SIZE_Y / 2) - 20;

  pa_script += ';\n' +
              '; Mark the test area for reference\n' +
              'M117 K0\n' +
              'SET_PRESSURE_ADVANCE ADVANCE=0 EXTRUDER=' + EXTRUDER_NAME + ' ; Set Pressure Advance 0\n' +
              moveTo(refStartX1, refStartY, basicSettings) +
              doEfeed('+', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +
              createLine(refStartX1, refStartY + 20, 20, basicSettings) +
              doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +
              moveTo(refStartX2, refStartY, basicSettings) +
              doEfeed('+', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +
              createLine(refStartX2, refStartY + 20, 20, basicSettings) +
              doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +
              zHop((HEIGHT_LAYER + Z_OFFSET) + 0.1, basicSettings);

  // print K values beside the test lines
  if (USE_LINENO) {
    var numStartX = CENTER_X + (0.5 * PATTERN_SIDE_LENGTH) + LENGTH_SLOW + (USE_PRIME ? 5 : 0) - 2,
        numStartY = PAT_START_Y - 2,
        stepping = 0;

    pa_script += ';\n' +
                '; print K-values\n' +
                ';\n';

    for (var i = PA_START; i <= PA_END; i += PA_STEP) {
      if (stepping % 2 === 0) {
        pa_script += moveTo(numStartX, numStartY + (stepping * PATTERN_SPACING), basicSettings) +
                    zHop((HEIGHT_LAYER + Z_OFFSET), basicSettings) +
                    doEfeed('+', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +
                    createGlyphs(numStartX, numStartY + (stepping * PATTERN_SPACING), basicSettings, Math.round10(i, PA_round)) +
                    doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +
                    zHop((HEIGHT_LAYER + Z_OFFSET) + 0.1, basicSettings);
      }
      stepping += 1;
    }
  }
  */

  pa_script += ';\n' +
              '; FINISH\n' +
              ';\n' +
              END_GCODE + '\n' +
              ';';

  txtArea.value = pa_script;
}


// Save content of textarea to file using
// https://github.com/eligrey/FileSaver.js
function saveTextAsFile() {
  var textToWrite = document.getElementById('gcodetextarea').value,
      textFileAsBlob = new Blob([textToWrite], {type: 'text/plain'}),
      usersFilename = document.getElementById('FILENAME').value,
      filename = usersFilename || '',
      fileNameToSaveAs = filename + '.gcode';
  if (textToWrite) {
    saveAs(textFileAsBlob, fileNameToSaveAs);
  } else {
    alert('Generate G-code first');
    return;
  }
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
(function() {

  /**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number} The adjusted value.
   */

  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || Number(exp) === 0) {
      return Math[type](value);
    }
    value = Number(value);
    exp = Number(exp);
    // If the value is not a number or the exp is not an integer...
    if (value === null || isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // If the value is negative...
    if (value < 0) {
      return -decimalAdjust(type, -value, exp);
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](Number(value[0] + 'e' + (value[1] ? (Number(value[1]) - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return Number(value[0] + 'e' + (value[1] ? (Number(value[1]) + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust('round', value, exp);
    };
  }
  // Decimal floor
  if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
      return decimalAdjust('floor', value, exp);
    };
  }
  // Decimal ceil
  if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
      return decimalAdjust('ceil', value, exp);
    };
  }
}());

// get the number of decimal places of a float
function getDecimals(num) {
  var match = (String(num)).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) {
    return num;
  }
  var decimalPlaces = Math.max(0, (match[1] ? match[1].length : 0) - (match[2] ? Number(match[2]) : 0));
  return decimalPlaces;
}

// print a line between current position and target
function createLine(coordX, coordY, length, basicSettings, optional) {
  var ext = 0,
      gcode = '';

  //handle optional function arguements passed as object
  var defaults = {
    speed: basicSettings['slow'],
    extMult: basicSettings['extMult'],
    extRatio: basicSettings['extRatio'],
    comment: ' ; print line\n'
  };
  var optArgs = $.extend({}, defaults, optional);

  ext = Math.round10(optArgs['extRatio'] * optArgs['extMult'] * Math.abs(length), EXT_round);

  gcode += 'G1 X' + Math.round10(rotateX(coordX, basicSettings['centerX'], coordY, basicSettings['centerY'], basicSettings['printDir']), XY_round) +
             ' Y' + Math.round10(rotateY(coordX, basicSettings['centerX'], coordY, basicSettings['centerY'], basicSettings['printDir']), XY_round) +
             ' E' + ext + ' F' + optArgs['speed'] + optArgs['comment'];

  return gcode;
}

// move print head to coordinates
function moveTo(coordX, coordY, basicSettings) {
  var gcode = '';

  gcode += 'G0 X' + Math.round10(rotateX(coordX, basicSettings['centerX'], coordY, basicSettings['centerY'], basicSettings['printDir']), XY_round) +
             ' Y' + Math.round10(rotateY(coordX, basicSettings['centerX'], coordY, basicSettings['centerY'], basicSettings['printDir']), XY_round) +
             ' F' + basicSettings['move'] + ' ; move to start\n';
  return gcode;
}

// create retract / un-retract gcode
function doEfeed(dir, basicSettings, type) {
  var gcode = '';

  switch (true) {
  case (type === 'STD' && dir === '+'):
    gcode += 'G1 E' + basicSettings['retractDist'] + ' F' + basicSettings['unretractSpeed'] + ' ; un-retract\n';
    break;
  case (type === 'STD' && dir === '-'):
    gcode += 'G1 E-' + basicSettings['retractDist'] + ' F' + basicSettings['retractSpeed'] + ' ; retract\n';
    break;
  case (type === 'FWR' && dir === '+'):
    gcode += 'G11 ; un-retract\n';
    break;
  case (type === 'FWR' && dir === '-'):
    gcode += 'G10 ; retract\n';
    break;
  }

  return gcode;
}

/*
// create standard test pattern
function createStdPattern(startX, startY, basicSettings, patSettings) {
  var j = 0,
      gcode = '';

  for (var i = patSettings['paStart']; i <= patSettings['paEnd']; i += patSettings['paStep']) {
    gcode += 'SET_PRESSURE_ADVANCE ADVANCE=' + Math.round10(i, PA_round) + ' EXTRUDER=' + basicSettings['extruderName'] + ' ; set Pressure Advance\n' +
             'M117 K' + Math.round10(i, PA_round) + ' ; \n' +
             doEfeed('+', basicSettings, (basicSettings['fwRetract'] ? 'FWR' : 'STD')) +
             createLine(startX + patSettings['lengthSlow'], startY + j, patSettings['lengthSlow'], basicSettings, {'speed': basicSettings['slow']}) +
             createLine(startX + patSettings['lengthSlow'] + patSettings['sideLength'], startY + j, patSettings['sideLength'], basicSettings, {'speed': basicSettings['fast']}) +
             createLine(startX + (2 * patSettings['lengthSlow']) + patSettings['sideLength'], startY + j, patSettings['lengthSlow'], basicSettings, {'speed': basicSettings['slow']}) +
             doEfeed('-', basicSettings, (basicSettings['fwRetract'] ? 'FWR' : 'STD')) +
             (i !== patSettings['paEnd'] ? moveTo(startX, startY + j + patSettings['lineSpacing'], basicSettings) : '');
    j += patSettings['lineSpacing'];
  }
  return gcode;
}
*/

/*

// create digits for K line numbering
function createGlyphs(startX, startY, basicSettings, value) {
  var glyphSegHeight = 2,
      glyphSegHeight2 = 0.4,
      glyphSpacing = 3.0,
      glyphString = '',
      xCount = 0,
      yCount = 0,
      sNumber = value.toString(),
      glyphSeg = {
        '1': ['up', 'up'],
        '2': ['mup', 'mup', 'right', 'down', 'left', 'down', 'right'],
        '3': ['mup', 'mup', 'right', 'down', 'down', 'left', 'mup', 'right'],
        '4': ['mup', 'mup', 'down', 'right', 'mup', 'down', 'down'],
        '5': ['right', 'up', 'left', 'up', 'right'],
        '6': ['mup', 'right', 'down', 'left', 'up', 'up', 'right'],
        '7': ['mup', 'mup', 'right', 'down', 'down'],
        '8': ['mup', 'right', 'down', 'left', 'up', 'up', 'right', 'down'],
        '9': ['right', 'up', 'left', 'up', 'right', 'down'],
        '0': ['right', 'up', 'up', 'left', 'down', 'down'],
        '.': ['dot']
      };

  for (var i = 0, len = sNumber.length; i < len; i += 1) {
    for (var key in glyphSeg[sNumber.charAt(i)]) {
      if(glyphSeg[sNumber.charAt(i)].hasOwnProperty(key)) {
        var up = createLine(startX + (xCount * glyphSegHeight), startY + (yCount * glyphSegHeight) + glyphSegHeight, glyphSegHeight, basicSettings, {'speed': basicSettings['slow'], 'comment': ' ; ' + sNumber.charAt(i) + '\n'}),
            down = createLine(startX + (xCount * glyphSegHeight), startY + (yCount * glyphSegHeight) - glyphSegHeight, glyphSegHeight, basicSettings, {'speed': basicSettings['slow'], 'comment': ' ; ' + sNumber.charAt(i) + '\n'}),
            right = createLine(startX + (xCount * glyphSegHeight) + glyphSegHeight, startY + (yCount * glyphSegHeight), glyphSegHeight, basicSettings, {'speed': basicSettings['slow'], 'comment': ' ; ' + sNumber.charAt(i) + '\n'}),
            left = createLine(startX + (xCount * glyphSegHeight) - glyphSegHeight, startY + (yCount * glyphSegHeight), glyphSegHeight, basicSettings, {'speed': basicSettings['slow'], 'comment': ' ; ' + sNumber.charAt(i) + '\n'}),
            mup = moveTo(startX + (xCount * glyphSegHeight), startY + (yCount * glyphSegHeight) + glyphSegHeight, basicSettings),
            dot = createLine(startX, startY + glyphSegHeight2, glyphSegHeight2, basicSettings, {speed: basicSettings['slow'], comment: ' ; dot\n'});
        if (glyphSeg[sNumber.charAt(i)][key] === 'up') {
          glyphString += up;
          yCount += 1;
        } else if (glyphSeg[sNumber.charAt(i)][key] === 'down') {
          glyphString += down;
          yCount -= 1;
        } else if (glyphSeg[sNumber.charAt(i)][key] === 'right') {
          glyphString += right;
          xCount += 1;
        } else if (glyphSeg[sNumber.charAt(i)][key] === 'left') {
          glyphString += left;
          xCount -= 1;
        } else if (glyphSeg[sNumber.charAt(i)][key] === 'mup') {
          glyphString += mup;
          yCount += 1;
        } else if (glyphSeg[sNumber.charAt(i)][key] === 'dot') {
          glyphString += dot;
        }
      }
    }
    if (sNumber.charAt(i) === '1' || sNumber.charAt(i) === '.') {
      startX += 1;
    } else {
      startX += glyphSpacing;
    }
    if (i !== sNumber.length - 1) {
      glyphString += doEfeed('-', basicSettings, (basicSettings['fwRetract'] ? 'FWR' : 'STD')) +
                     moveTo(startX, startY, basicSettings) +
                     doEfeed('+', basicSettings, (basicSettings['fwRetract'] ? 'FWR' : 'STD'));
    }
    yCount = 0;
    xCount = 0;
  }
  return glyphString;
}
*/

/*
// gcode for small z hop
function zHop(hop, basicSettings) {
  var gcode = '';

  gcode += 'G1 Z' + Math.round10(hop, Z_round) + ' F' + basicSettings['slow'] + ' ; zHop\n';

  return gcode;
}
*/


// rotate x around a defined center xm, ym
function rotateX(x, xm, y, ym, a) {
  a = a * Math.PI / 180; // Convert to radians
  var cos = Math.cos(a),
      sin = Math.sin(a);

  // Subtract midpoints, so that midpoint is translated to origin
  // and add it in the end again
  //var xr = (x - xm) * cos - (y - ym) * sin + xm; //CCW
  var xr = (cos * (x - xm)) + (sin * (y - ym)) + xm; //CW
  return xr;
}


// rotate y around a defined center xm, ym
function rotateY(x, xm, y, ym, a) {
  a = a * Math.PI / 180; // Convert to radians
  var cos = Math.cos(a),
      sin = Math.sin(a);

  // Subtract midpoints, so that midpoint is translated to origin
  // and add it in the end again
  //var yr = (x - xm) * sin + (y - ym) * cos + ym; //CCW
  var yr = (cos * (y - ym)) - (sin * (x - xm)) + ym; //CW
  return yr;
}

// save current settings as localStorage object
function setLocalStorage() {
  var FILAMENT_DIAMETER = parseFloat($('#FIL_DIA').val()),
      NOZZLE_DIAMETER = parseFloat($('#NOZ_DIA').val()),
      LINE_RATIO = parseFloat($('#LINE_RATIO').val()),
      START_GCODE = $('#START_GCODE').val(),
      END_GCODE = $('#END_GCODE').val(),
      SPEED_FIRSTLAYER = parseInt($('#FIRSTLAYER_SPEED').val()),
      SPEED_FILL = parseInt($('#FILL_SPEED').val()),
      SPEED_PERIMETER = parseInt($('#PERIMETER_SPEED').val()),
      SPEED_MOVE = parseInt($('#MOVE_SPEED').val()),
      SPEED_RETRACT = parseInt($('#RETRACT_SPEED').val()),
      ACCELERATION = parseInt($('#PRINT_ACCL').val()),
      RETRACT_DIST = parseFloat($('#RETRACTION').val()),
      BED_SHAPE = $('#SHAPE_BED').val(),
      BED_X = parseInt($('#BEDSIZE_X').val()),
      BED_Y = parseInt($('#BEDSIZE_Y').val()),
      NULL_CENTER = $('#CENTER_NULL').prop('checked'),
      HEIGHT_FIRSTLAYER = parseFloat($('#LAYER_HEIGHT_FIRSTLAYER').val()),
      HEIGHT_LAYER = parseFloat($('#LAYER_HEIGHT').val()),
      HEIGHT_PRINT = parseFloat($('#PRINT_HEIGHT').val()),
      EXTRUDER_NAME = $('#EXTRUDER_NAME').val(),
      FAN_SPEED_FIRSTLAYER = parseFloat($('#FAN_SPEED_FIRSTLAYER').val()),
      FAN_SPEED = parseFloat($('#FAN_SPEED').val()),
      EXT_MULT = parseFloat($('#EXTRUSION_MULT').val()),
      //PATTERN_TYPE = $('#TYPE_PATTERN').val(),
      PA_START = parseFloat($('#PA_START').val()),
      PA_END = parseFloat($('#PA_END').val()),
      PA_STEP = parseFloat($('#PA_STEP').val()),
      PRINT_DIR = $('#DIR_PRINT').val(),
      PATTERN_SPACING = parseFloat($('#PATTERN_SPACING').val()),
      PATTERN_ANGLE = parseFloat($('#PATTERN_ANGLE').val()),
      PERIMETERS = parseFloat($('#PERIMETERS').val()),
      //USE_FRAME = $('#FRAME').prop('checked'),
      USE_PRIME = $('#PRIME').prop('checked'),
      EXT_MULT_PRIME = parseFloat($('#PRIME_EXT').val()),
      SPEED_PRIME = parseFloat($('#PRIME_SPEED').val()),
      //PRIME_DWELL = parseFloat($('#DWELL_PRIME').val()),
      //LENGTH_SLOW = parseFloat($('#SLOW_LENGTH').val()),
      PATTERN_SIDE_LENGTH = parseFloat($('#PATTERN_SIDE_LENGTH').val()),
      //Z_OFFSET = parseFloat($('#OFFSET_Z').val()),
      USE_FWR = $('#USE_FWR').prop('checked'),
      USE_MMS = $('#MM_S').prop('checked'),
      USE_LINENO = $('#LINE_NO').prop('checked');

  var settings = {
    'FILAMENT_DIAMETER': FILAMENT_DIAMETER,
    'NOZZLE_DIAMETER': NOZZLE_DIAMETER,
    'LINE_RATIO': LINE_RATIO,
    'START_GCODE': START_GCODE,
    'END_GCODE': END_GCODE,
    'SPEED_FIRSTLAYER': SPEED_FIRSTLAYER,
    'SPEED_PERIMETER': SPEED_PERIMETER,
    'SPEED_MOVE': SPEED_MOVE,
    'SPEED_RETRACT': SPEED_RETRACT,
    'ACCELERATION': ACCELERATION,
    'RETRACT_DIST': RETRACT_DIST,
    'BED_SHAPE': BED_SHAPE,
    'BED_X': BED_X,
    'BED_Y': BED_Y,
    'NULL_CENTER': NULL_CENTER,
    'HEIGHT_FIRSTLAYER': HEIGHT_FIRSTLAYER,
    'HEIGHT_LAYER': HEIGHT_LAYER,
    'HEIGHT_PRINT': HEIGHT_PRINT,
    'EXTRUDER_NAME': EXTRUDER_NAME,
    'FAN_SPEED_FIRSTLAYER' : FAN_SPEED_FIRSTLAYER,
    'FAN_SPEED' : FAN_SPEED,
    'EXT_MULT': EXT_MULT,
    //'PATTERN_TYPE': PATTERN_TYPE,
    'PA_START': PA_START,
    'PA_END': PA_END,
    'PA_STEP': PA_STEP,
    'PRINT_DIR': PRINT_DIR,
    'PATTERN_SPACING': PATTERN_SPACING,
    'PATTERN_ANGLE': PATTERN_ANGLE,
    'PERIMETERS': PERIMETERS,
    //'USE_FRAME': USE_FRAME,
    'USE_PRIME': USE_PRIME,
    'EXT_MULT_PRIME': EXT_MULT_PRIME,
    'SPEED_PRIME' : SPEED_PRIME,
    //'PRIME_DWELL': PRIME_DWELL,
    //'LENGTH_SLOW': LENGTH_SLOW,
    'PATTERN_SIDE_LENGTH': PATTERN_SIDE_LENGTH,
    //'Z_OFFSET': Z_OFFSET,
    'USE_FWR': USE_FWR,
    'USE_MMS': USE_MMS,
    'USE_LINENO': USE_LINENO
  };

  const lsSettings = JSON.stringify(settings);
  window.localStorage.setItem('PA_SETTINGS', lsSettings);
}

// toggle between mm/s and mm/min speed settings
function speedToggle() {
  var SPEED_FIRSTLAYER = $('#FIRSTLAYER_SPEED').val(),
      SPEED_FILL = $('#FILL_SPEED').val(),
      SPEED_PERIMETER = $('#PERIMETER_SPEED').val(),
      SPEED_MOVE = $('#MOVE_SPEED').val(),
      SPEED_RETRACT = $('#RETRACT_SPEED').val(),
      SPEED_PRIME = $('#PRIME_SPEED').val(),
      SPEED_UNRETRACT = $('#UNRETRACT_SPEED').val();
  if ($('#MM_S').is(':checked')) {
    SPEED_FIRSTLAYER = $('#FIRSTLAYER_SPEED').val();
    SPEED_FILL = $('#PERIMETER_FILL').val();
    SPEED_PERIMETER = $('#PERIMETER_SPEED').val();
    SPEED_MOVE = $('#MOVE_SPEED').val();
    SPEED_RETRACT = $('#RETRACT_SPEED').val();
    SPEED_UNRETRACT = $('#UNRETRACT_SPEED').val();
    SPEED_PRIME = $('#PRIME_SPEED').val();
    $('#FIRSTLAYER_SPEED').val(SPEED_FIRSTLAYER / 60);
    $('#FILL_SPEED').val(SPEED_FILL / 60);
    $('#PERIMETER_SPEED').val(SPEED_PERIMETER / 60);
    $('#MOVE_SPEED').val(SPEED_MOVE / 60);
    $('#RETRACT_SPEED').val(SPEED_RETRACT / 60);
    $('#UNRETRACT_SPEED').val(SPEED_UNRETRACT / 60);
    $('#PRIME_SPEED').val(SPEED_PRIME / 60);
  } else {
    SPEED_FIRSTLAYER = $('#FIRSTLAYER_SPEED').val();
    SPEED_FILL = $('#PERIMETER_FILL').val();
    SPEED_PERIMETER = $('#PERIMETER_SPEED').val();
    SPEED_MOVE = $('#MOVE_SPEED').val();
    SPEED_RETRACT = $('#RETRACT_SPEED').val();
    SPEED_UNRETRACT = $('#UNRETRACT_SPEED').val();
    SPEED_PRIME = $('#PRIME_SPEED').val();
    $('#FIRSTLAYER_SPEED').val(SPEED_FIRSTLAYER * 60);
    $('#FILL_SPEED').val(SPEED_FILL * 60);
    $('#PERIMETER_SPEED').val(SPEED_PERIMETER * 60);
    $('#MOVE_SPEED').val(SPEED_MOVE * 60);
    $('#RETRACT_SPEED').val(SPEED_RETRACT * 60);
    $('#UNRETRACT_SPEED').val(SPEED_UNRETRACT * 60);
    $('#PRIME_SPEED').val(SPEED_PRIME * 60);
  }
}

// toggle between round and rectangular bed shape
function toggleBedShape() {
  if ($('#SHAPE_BED').val() === 'Round') {
    $('label[for=\'BEDSIZE_X\']').text('Bed Diameter:');
    $('#shape').text('Diameter (mm) of the bed');
    $('#BEDSIZE_Y').prop('disabled', true);
    $('label[for=BEDSIZE_Y]').css({opacity: 0.5});
    if (!$('#CENTER_NULL').is(':checked')) {
      $('#CENTER_NULL').prop('checked', !$('#CENTER_NULL').prop('checked'));
    }
  } else {
    $('label[for=\'BEDSIZE_X\']').text('Bed Size X:');
    $('#shape').text('Size (mm) of the bed in X');
    $('#BEDSIZE_Y').prop('disabled', false);
    $('label[for=BEDSIZE_Y]').css({opacity: 1});
  }
}

/*
// toggle between standard and alternate pattern type
function patternType() {
  if ($('#TYPE_PATTERN').val() === 'alt') {
    if ($('#FRAME').is(':checked')) {
      $('#FRAME').prop('checked', false);
      $('#FRAME').prop('disabled', true);
      $('label[for=FRAME]').css({opacity: 0.5});
    } else {
      $('#FRAME').prop('disabled', true);
      $('label[for=FRAME]').css({opacity: 0.5});
    }
  } else if ($('#TYPE_PATTERN').val() === 'std'){
    $('#FRAME').prop('disabled', false);
    $('label[for=FRAME]').css({opacity: 1});
  }
}
*/

// toggle prime relevant options
function togglePrime() {
  if ($('#PRIME').is(':checked')) {
    $('#PRIME_EXT').prop('disabled', false);
    $('label[for=PRIME_EXT]').css({opacity: 1});
  } else {
    $('#PRIME_EXT').prop('disabled', true);
    $('label[for=PRIME_EXT]').css({opacity: 0.5});
  }
}

// toggle between standard and firmware retract
function toggleRetract() {
  if ($('#USE_FWR').is(':checked')) {
    $('#RETRACTION').prop('disabled', true);
    $('label[for=RETRACTION]').css({opacity: 0.5});
    $('#RETRACT_SPEED').prop('disabled', true);
    $('label[for=RETRACT_SPEED]').css({opacity: 0.5});
    $('#UNRETRACT_SPEED').prop('disabled', true);
    $('label[for=UNRETRACT_SPEED]').css({opacity: 0.5});

  } else {
    $('#RETRACTION').prop('disabled', false);
    $('label[for=RETRACTION]').css({opacity: 1.0});
    $('#RETRACT_SPEED').prop('disabled', false);
    $('label[for=RETRACT_SPEED]').css({opacity: 1.0});
    $('#UNRETRACT_SPEED').prop('disabled', false);
    $('label[for=UNRETRACT_SPEED]').css({opacity: 1.0});
  }
}

// sanity checks for pattern / bed size
function validateInput() {
  var testNaN = {
      // do not use parseInt or parseFloat for validating, since both
      // functions will have special parsing characteristics leading to
      // false numeric validation
      BEDSIZE_X: $('#BEDSIZE_X').val(),
      BEDSIZE_Y: $('#BEDSIZE_Y').val(),
      PA_START: $('#PA_START').val(),
      PA_END: $('#PA_END').val(),
      PA_STEP: $('#PA_STEP').val(),
      PATTERN_SPACING: $('#PATTERN_SPACING').val(),
      PATTERN_ANGLE: $('#PATTERN_ANGLE').val(),
      FIRSTLAYER_SPEED: $('#FIRSTLAYER_SPEED').val(),
      FILL_SPEED: $('#FILL_SPEED').val(),
      PERIMETER_SPEED: $('#PERIMETER_SPEED').val(),
      //SLOW_LENGTH: $('#SLOW_LENGTH').val(),
      PATTERN_SIDE_LENGTH: $('#PATTERN_SIDE_LENGTH').val(),
      FIL_DIA: $('#FIL_DIA').val(),
      NOZ_DIA: $('#NOZ_DIA').val(),
      LINE_RATIO: $('#LINE_RATIO').val(),
      LAYER_HEIGHT: $('#LAYER_HEIGHT').val(),
      HEIGHT_FIRSTLAYER: $('#LAYER_HEIGHT_FIRSTLAYER').val(),
      FAN_SPEED_FIRSTLAYER: $('#FAN_SPEED_FIRSTLAYER').val(),
      FAN_SPEED: $('#FAN_SPEED').val(),
      EXTRUSION_MULT: $('#EXTRUSION_MULT').val(),
      PRIME_EXT: $('#PRIME_EXT').val(),
      //OFFSET_Z: $('#OFFSET_Z').val(),
      MOVE_SPEED: $('#MOVE_SPEED').val(),
      RETRACT_SPEED: $('#RETRACT_SPEED').val(),
      PRINT_ACCL: $('#PRINT_ACCL').val(),
      RETRACTION: $('#RETRACTION').val(),
      PRIME_SPEED: $('#PRIME_SPEED').val(),
      //DWELL_PRIME: $('#DWELL_PRIME').val()
    },
    selectShape = $('#SHAPE_BED'),
    bedShape = selectShape.val(),
    selectDir = $('#DIR_PRINT'),
    printDir = selectDir.val(),
    usePrime = $('#PRIME').prop('checked'),
    useLineNo = $('#LINE_NO').prop('checked'),
    //sizeY = ((parseFloat(testNaN['PA_END']) - parseFloat(testNaN['PA_START'])) / parseFloat(testNaN['PA_STEP']) * parseFloat(testNaN['PATTERN_SPACING'])) + 25, // +25 with ref marking
    //sizeX = (2 * parseFloat(testNaN['SLOW_LENGTH'])) + parseFloat(testNaN['PATTERN_SIDE_LENGTH']) + (usePrime ? 10 : 0) + (useLineNo ? 8 : 0),
    sizeY = 999999, // TODO
    sizeX = 999999, // TODO

    /* TODO: This is almost certainly trash
            RANGE_PA = parseFloat(testNaN['PA_END']) - parseFloat(testNaN['PA_START']),
            NUM_PATTERNS = RANGE_PA / parseFloat(testNaN['PA_STEP']),

            PRINT_SIZE_X = (NUM_PATTERNS * ((parseFloat(testNaN['PERIMETERS']) - 1) * LINE_SPACING_45)) + ((NUM_PATTERNS - 1) *  parseFloat(testNaN['PATTERN_SPACING'])) + Math.sqrt((Math.pow(parseFloat(testNaN['PATTERN_SIDE_LENGTH']), 2) / 2)),
            PRINT_SIZE_X = Math.round10(PRINT_SIZE_X, XY_round), // round it
            sizeX = PRINT_SIZE_X + LINE_WIDTH, // yes, this is right... just adds the round ends. Half-circle on each side (so = whole circle)... which is diameter of LINE_WIDTH

            PRINT_SIZE_Y = Math.sqrt(Math.pow(PATTERN_SIDE_LENGTH, 2) * 2),
            PRINT_SIZE_Y = Math.round10(PRINT_SIZE_Y, XY_round), // round it
            sizeY = PRINT_SIZE_Y + LINE_WIDTH, // yes, this is right... just adds the round ends. Half-circle on each side (so = whole circle)... which is diameter of LINE_WIDTH
    */

    printDirRad = printDir * Math.PI / 180,
    fitWidth = Math.round10(Math.abs(sizeX * Math.cos(printDirRad)) + Math.abs(sizeY * Math.sin(printDirRad)), 0),
    fitHeight = Math.round10(Math.abs(sizeX * Math.sin(printDirRad)) + Math.abs(sizeY * Math.cos(printDirRad)), 0),
    decimals = getDecimals(parseFloat(testNaN['PA_STEP'])),
    invalidDiv = 0;

  // Start clean
  $('#PA_START,#PA_END,#PA_STEP,#PATTERN_SPACING,#PATTERN_ANGLE,#PATTERN_SIDE_LENGTH,#FIL_DIA,#NOZ_DIA,#LAYER_HEIGHT,#LAYER_HEIGHT_FIRSTLAYER,#EXTRUSION_MULT,#PRIME_EXT,#LINE_RATIO,'
     + '#START_GCODE,#END_GCODE,#MOVE_SPEED,#RETRACT_SPEED,#UNRETRACT_SPEED,#PRINT_ACCL,#RETRACTION,#PRIME_SPEED,#FIRSTLAYER_SPEED','#FILL_SPEED','#PERIMETER_SPEED').each((i,t) => {
    t.setCustomValidity('');
    const tid = $(t).attr('id');
    $(`label[for=${tid}]`).removeClass();
  });
  $('#warning1').hide();
  $('#warning2').hide();
  $('#warning3').hide();
  $('#button').prop('disabled', false);

  /* // TODO
  // Check for proper numerical values
  Object.keys(testNaN).forEach((k) => {
    if ((isNaN(testNaN[k]) && !isFinite(testNaN[k])) || testNaN[k].trim().length === 0) {
      $('label[for=' + k + ']').addClass('invalidNumber');
      //$('#' + k)[0].setCustomValidity('The value is not a proper number.'); // TODO ??
      $('#warning3').text('Some values are not proper numbers. Check highlighted Settings.');
      $('#warning3').addClass('invalidNumber');
      $('#warning3').show();
      $('#button').prop('disabled', true);
    }
  });
  */

  // Check if Pressure Advance Stepping is a multiple of the Pressure Advance Range
  if ((Math.round10(parseFloat(testNaN['PA_END']) - parseFloat(testNaN['PA_START']), PA_round) * Math.pow(10, decimals)) % (parseFloat(testNaN['PA_STEP']) * Math.pow(10, decimals)) !== 0) {
    $('label[for=PA_START]').addClass('invalidDiv');
    $('#PA_START')[0].setCustomValidity('Pressure Advance range cannot be cleanly divided.');
    $('label[for=PA_END]').addClass('invalidDiv');
    $('#PA_END')[0].setCustomValidity('Pressure Advance range cannot be cleanly divided.');
    $('label[for=PA_STEP]').addClass('invalidDiv');
    $('#PA_STEP')[0].setCustomValidity('Pressure Advance range cannot be cleanly divided.');
    $('#warning1').text('Your Pressure Advance range cannot be cleanly divided. Check highlighted Pattern Settings.');
    $('#warning1').addClass('invalidDiv');
    $('#warning1').show();
    $('#button').prop('disabled', true);
    invalidDiv = 1;
  }

  /*
  // Check if pattern settings exceed bed size
  if (bedShape === 'Round' && (Math.sqrt(Math.pow(fitWidth, 2) + Math.pow(fitHeight, 2)) > (parseInt(testNaN['BEDSIZE_X']) - 5)) && fitHeight > fitWidth) {
    $('label[for=PA_START]').addClass('invalidSize');
    $('#PA_START')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.');
    $('label[for=PA_END]').addClass('invalidSize');
    $('#PA_END')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.');
    $('label[for=PA_STEP]').addClass('invalidSize');
    $('#PA_STEP')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.');
    $('label[for=PATTERN_SPACING]').addClass('invalidSize');
    $('#PATTERN_SPACING')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.'); // TODO: Pattern angle?
    $((invalidDiv ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter. Check highlighted Pattern Settings.');
    $((invalidDiv ? '#warning2' : '#warning1')).addClass('invalidSize');
    $((invalidDiv ? '#warning2' : '#warning1')).show();
  }

  if (bedShape === 'Round' && (Math.sqrt(Math.pow(fitWidth, 2) + Math.pow(fitHeight, 2)) > (parseInt(testNaN['BEDSIZE_X']) - 5)) && fitWidth > fitHeight) {
    $('label[for=SLOW_LENGTH]').addClass('invalidSize');
    $('#SLOW_LENGTH')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.');
    $('label[for=PATTERN_SIDE_LENGTH]').addClass('invalidSize');
    $('#PATTERN_SIDE_LENGTH')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.');// TODO: Pattern angle?
    $((invalidDiv ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter. Check highlighted Pattern Settings.');
    $((invalidDiv ? '#warning2' : '#warning1')).addClass('invalidSize');
    $((invalidDiv ? '#warning2' : '#warning1')).show();
  }

  if (bedShape === 'Rect' && fitWidth > (parseInt(testNaN['BEDSIZE_X']) - 5)) {
    $('label[for=SLOW_LENGTH]').addClass('invalidSize');
    $('#SLOW_LENGTH')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your X bed size.');
    $('label[for=PATTERN_SIDE_LENGTH]').addClass('invalidSize');
    $('#PATTERN_SIDE_LENGTH')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your X bed size.');// TODO: Pattern angle?
    $((invalidDiv ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your X bed size. Check highlighted Pattern Settings.');
    $((invalidDiv ? '#warning2' : '#warning1')).addClass('invalidSize');
    $((invalidDiv ? '#warning2' : '#warning1')).show();
  }

  if (bedShape === 'Rect' && fitHeight > (parseInt(testNaN['BEDSIZE_Y']) - 5)) {
    $('label[for=PA_START]').addClass('invalidSize');
    $('#PA_START')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your Y bed size.');
    $('label[for=PA_END]').addClass('invalidSize');
    $('#PA_END')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your Y bed size.');
    $('label[for=PA_STEP]').addClass('invalidSize');
    $('#PA_STEP')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your Y bed size.');
    $('label[for=PATTERN_SPACING]').addClass('invalidSize');// TODO: Pattern angle?
    $('#PATTERN_SPACING')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your Y bed size.');// TODO: Pattern angle?
    $((invalidDiv ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your Y bed size. Check highlighted Pattern Settings.');
    $((invalidDiv ? '#warning2' : '#warning1')).addClass('invalidSize');
    $((invalidDiv ? '#warning2' : '#warning1')).show();
  }
  */
}

$(window).load(() => {
  // Adapt textarea to cell size
  var TXTAREAHEIGHT = $('.txtareatd').height();
  $('.calibpat #gcodetextarea').css({'height': (TXTAREAHEIGHT) + 'px'});

  // create tab index dynamically
  $(':input:not(:hidden)').each(function(i) {
    $(this).attr('tabindex', i + 1);
  });

  // Get localStorage data
  var lsSettings = window.localStorage.getItem('PA_SETTINGS');

  if (lsSettings) {
    var settings = jQuery.parseJSON(lsSettings);
    $('#FIL_DIA').val(settings['FILAMENT_DIAMETER']);
    $('#NOZ_DIA').val(settings['NOZZLE_DIAMETER']);
    $('#LINE_RATIO').val(settings['LINE_RATIO']);
    $('#START_GCODE').val(settings['START_GCODE']);
    $('#END_GCODE').val(settings['END_GCODE']);
    $('#FIRSTLAYER_SPEED').val(settings['SPEED_FIRSTLAYER']);
    $('#FILL_SPEED').val(settings['SPEED_FILL']);
    $('#PERIMETER_SPEED').val(settings['SPEED_PERIMETER']);
    $('#MOVE_SPEED').val(settings['SPEED_MOVE']);
    $('#RETRACT_SPEED').val(settings['SPEED_RETRACT']);
    $('#PRINT_ACCL').val(settings['ACCELERATION']);
    $('#RETRACTION').val(settings['RETRACT_DIST']);
    $('#SHAPE_BED').val(settings['BED_SHAPE']);
    $('#BEDSIZE_X').val(settings['BED_X']);
    $('#BEDSIZE_Y').val(settings['BED_Y']);
    $('#CENTER_NULL').prop('checked', settings['NULL_CENTER']);
    $('#LAYER_HEIGHT_FIRSTLAYER').val(settings['HEIGHT_FIRSTLAYER']);
    $('#LAYER_HEIGHT').val(settings['HEIGHT_LAYER']);
    $('#PRINT_HEIGHT').val(settings['HEIGHT_PRINT']);
    $('#EXTRUDER_NAME').val(settings['EXTRUDER_NAME']);
    $('#FAN_SPEED_FIRSTLAYER').val(settings['FAN_SPEED_FIRSTLAYER']);
    $('#FAN_SPEED').val(settings['FAN_SPEED']);
    $('#EXTRUSION_MULT').val(settings['EXT_MULT']);
    //$('#TYPE_PATTERN').val(settings['PATTERN_TYPE']);
    $('#PA_START').val(settings['PA_START']);
    $('#PA_END').val(settings['PA_END']);
    $('#PA_STEP').val(settings['PA_STEP']);
    $('#DIR_PRINT').val(settings['PRINT_DIR']);
    $('#PATTERN_SPACING').val(settings['PATTERN_SPACING']);
    $('#PATTERN_ANGLE').val(settings['PATTERN_ANGLE']);
    $('#PERIMETERS').val(settings['PERIMETERS']);
    //$('#FRAME').prop('checked', settings['USE_FRAME']);
    $('#PRIME').prop('checked', settings['USE_PRIME']);
    $('#PRIME_EXT').val(settings['EXT_MULT_PRIME']);
    $('#PRIME_SPEED').val(settings['SPEED_PRIME']);
    //$('#DWELL_PRIME').val(settings['PRIME_DWELL']);
    //$('#SLOW_LENGTH').val(settings['LENGTH_SLOW']);
    $('#PATTERN_SIDE_LENGTH').val(settings['PATTERN_SIDE_LENGTH']);
    //$('#OFFSET_Z').val(settings['Z_OFFSET']);
    $('#USE_FWR').prop('checked', settings['USE_FWR']);
    $('#MM_S').prop('checked', settings['USE_MMS']);
    $('#LINE_NO').prop('checked', settings['USE_LINENO']);

    //toggleBedShape();
    //patternType();
    //togglePrime();
    //toggleRetract();
  }

  // toggle between mm/s and mm/min speeds
  $('#MM_S').change(speedToggle);

  // Toggle Bed Shape
  $('#SHAPE_BED').change(() => {
    toggleBedShape();
    validateInput();
  });

  // toggle prime relevant html elements
  $('#PRIME').change(togglePrime);

  /*
  // frame and alternate pattern are mutually exclusive
  $('#TYPE_PATTERN').change(patternType);
  */

  // Change retract type
  $('#USE_FWR').change(toggleRetract);

  // Focus the first field
  $('#kfactor input:first').focus();

});
