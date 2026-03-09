(function($) {
  var gridOptions = [
    { character: 'C', name: 'Гелидный криотеум' },
    { character: 'E', name: 'Жидкий эндер' },
    { character: 'D', name: 'Алмазный блок' },
    { character: 'G', name: 'Графитовый блок' },
    { character: 'R', name: 'Дестабилизированный редстоун' },
    { character: 'X', name: 'Управляющий стержень' },
    { character: 'L', name: 'Золотой блок' },
    { character: 'O', name: 'Воздух' }
  ];

  var materials = {
    redstone: { key: 'redstone', name: 'Редстоун' },
    enderPearl: { key: 'enderPearl', name: 'Жемчуг Края' },
    diamond: { key: 'diamond', name: 'Алмаз' },
    cryotheum: { key: 'cryotheum', name: 'Криотеумная пыль' },
    snowball: { key: 'snowball', name: 'Снежок' },
    niter: { key: 'niter', name: 'Селитра' },
    sandstone: { key: 'sandstone', name: 'Песчаник' },
    blizzPowder: { key: 'blizzPowder', name: 'Порошок Близа' },
    graphiteBar: { key: 'graphiteBar', name: 'Графитовый слиток' },
    charcoal: { key: 'charcoal', name: 'Древесный уголь' },
    gravel: { key: 'gravel', name: 'Гравий' },
    ironIngot: { key: 'ironIngot', name: 'Железный слиток' },
    yelloriumIngot: { key: 'yelloriumIngot', name: 'Слиток тория' },
    fuelRod: { key: 'fuelRod', name: 'Ториевый топливный стержень' },
    sand: { key: 'sand', name: 'Песок' },
    reactorCasing: { key: 'reactorCasing', name: 'Корпус реактора' },
    reactorController: { key: 'reactorController', name: 'Контроллер' },
    controlRod: { key: 'controlRod', name: 'Управляющий стержень' },
    goldIngot: { key: 'goldIngot', name: 'Золотой слиток' }
  };

  var makeRecipe = function(numYield, ingredients) {
    return {
      numYield: numYield,
      ingredients: ingredients
    };
  };

  var materialCosts = {
    cryotheum: makeRecipe(2, [[materials.blizzPowder, 1], [materials.niter, 1], [materials.redstone, 1], [materials.snowball, 1]]),
    blizzPowder: makeRecipe(1, [[materials.redstone, 2], [materials.snowball, 1]]),
    niter: makeRecipe(1, [[materials.sandstone, 10]]), 
    graphiteBar: makeRecipe(1, [[materials.charcoal, 1]]), 
    fuelRod: makeRecipe(1, [[materials.graphiteBar, 2], [materials.ironIngot, 6], [materials.yelloriumIngot, 1]]),
    sandstone: makeRecipe(1, [[materials.sand, 4]]),
    reactorCasing: makeRecipe(4, [[materials.graphiteBar, 4], [materials.ironIngot, 4], [materials.yelloriumIngot, 1]]),
    reactorController: makeRecipe(1, [[materials.diamond, 1], [materials.reactorCasing, 4], [materials.redstone, 1], [materials.yelloriumIngot, 2]]),
    controlRod: makeRecipe(1, [[materials.graphiteBar, 3], [materials.reactorCasing, 4], [materials.redstone, 1], [materials.yelloriumIngot, 1]])
  };

  var reactorContentsMaterials = {
    R: [[materials.redstone, 10]],
    E: [[materials.enderPearl, 4]],
    D: [[materials.diamond, 9]],
    C: [[materials.cryotheum, 10]],
    G: [[materials.graphiteBar, 9]],
    X: materialCosts.fuelRod.ingredients,
    L: [[materials.goldIngot, 9]]
  };

  var modpacks = {
    defaults: { name: 'По умолчанию', key: 'defaults' },
    direwolf20: { name: 'Direwolf20', key: 'direwolf20' },
    btp: { name: 'BTP', key: 'btp' }
  };

  var makeConfig = function(fuelUsageMultiplier, powerProductionMultiplier) {
    return {
      fuelUsageMultiplier: fuelUsageMultiplier,
      powerProductionMultiplier: powerProductionMultiplier
    };
  };

  var modpackConfigs = {
        defaults: makeConfig(1.0, 1.0),
        direwolf20: makeConfig(10.0, 1.0), 
        btp: makeConfig(1.3, 0.7)
      },
      modpackConfig = modpackConfigs.defaults;

  var SAMPLE_RESPONSE = {"fuelConsumption":0.2192493975162506,"output":31835.994140625,"fuelFertility":510.647,"coolantTemperature":20.0,"fuelHeat":750.65656,"reactorHeat":721.741};

  var MIN_SIZE = 1, MIN_HEIGHT = 1, MAX_SIZE = 30, MAX_HEIGHT = 46;
  var MIN_CELL_SIZE = 20, MAX_CELL_SIZE = 60;

  var costModes = { breakdown: 1, totals: 2 }, costMode = costModes.breakdown;
  var cellSize, maxReactorWidth, maxReactorHeight;

  var addCommas = function(nStr) {
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  };

  var rlencode = function(input) {
    return $.map(input.match(/(.)\1*/g), function(substr) {
      var r = '';
      if (substr.length > 1) {
        r += substr.length;
      }
      r += substr[0];
      return r;
    }).join('');
  };

  var rldecode = function(encoded) {
    var split = encoded.match(/(\d*.)/g);
    return $.map(split, function(token) {
      var tokenParts = token.match(/(\d*)(.)/);
      return new Array(1 + (tokenParts[1] == '' ? 1 : parseInt(tokenParts[1]))).join(tokenParts[2]);
    }).join('');
  };

  var setSizes = function () {
    maxReactorWidth = ($(window).width() - $('#reactor-controls').width() - 100);
    maxReactorHeight = ($(window).height() - $('.masthead').height() - 100);

    var reactorWidth = $('.grid-table tr:first td').length
        , reactorHeight = $('.grid-table tr').length
        , preferredCellWidth = maxReactorWidth / reactorWidth
        , preferredCellHeight = maxReactorHeight / reactorHeight;

    cellSize = Math.min(preferredCellWidth, preferredCellHeight, MAX_CELL_SIZE);
    cellSize = Math.max(cellSize, MIN_CELL_SIZE);

    $('.grid-table .texture').width(cellSize).height(cellSize);
  };

  var updateReactor = function(params) {
    var reactor = $('#reactor-area');
    reactor.data($.extend(reactor.data(), params));
    var reactorParams = reactor.data();

    if (reactorParams.x && reactorParams.z && reactorParams.height) {
      $('#reactor-title').html('Редактирование: ' +
      reactorParams.x + 'x' + reactorParams.z + 'x' + reactorParams.height);
    }

    delete params['x'];
    delete params['z'];
    updateHashParams(params);

    if (reactor.data('activelyCooled')) {
      $('.passive-only').hide();
      $('.active-only').show();
    } else {
      $('.active-only').hide();
      $('.passive-only').show();
    }

    $('#live-height-label').html(reactorParams.height);

    if (isAutoUpdate()) {
      simulate();
    }
  };

  var createReactor = function(x, z, height, activelyCooled, controlRodInsertion) {
    x = parseInt(x);
    z = parseInt(z);
    height = parseInt(height);
    activelyCooled = JSON.parse(activelyCooled);
    controlRodInsertion = parseInt(controlRodInsertion);

    updateReactor({
      x: x,
      z: z,
      height: height,
      activelyCooled: activelyCooled,
      controlRodInsertion: controlRodInsertion
    });

    var reactorArea = $('#reactor-area').html('');

    var gridTable = $('<table class="grid-table"></table>')

    for (var i = 0; i <= x+1; i++) {
      var gridRow = $('<tr></tr>');
      for (var j = 0; j <= z+1; j++) {
        var elmt = $('<td></td>');

        if (i == 0 || i == x+1 || j == 0 || j == z+1) {
          if ((i == 0 && j == 0) || (i == x+1 && j == 0) || (i == 0 && j == z+1) || (i == x+1 && j == z+1)) {
            elmt.append(getTextureImg('casing-corner'));
          } else if (i == 0 || i == x+1) {
            elmt.append(getTextureImg('casing-lr'));
          } else {
            elmt.append(getTextureImg('casing-ud'));
          }
          elmt.addClass('casing');
        } else {
          elmt.addClass('contents');
        }

        gridRow.append(elmt);
      }
      gridTable.append(gridRow);
    }
    $('#simulation-results').show();

    reactorArea.append(gridTable);
    setSizes();
    calculateCost();
  };

  var isAutoUpdate = function() {
    return $('#auto-update').is(':checked');
  };

  var selectGridOption = function(char) {
    var selected = $('.grid-option')
        .removeClass('selected')
        .filter(function() { return $(this).data('character') == char; })
        .addClass('selected');
    $('#grid-selection').html(selected.data('name'));
  };

  var selectedGridOption = function() {
    return $('.grid-option.selected');
  };

  var getTextureImg = function(character) {
    var elmt = $('<div class="texture"></div>').html('&nbsp;');
    if (character != 'O') {
      elmt.css('background-image', 'url(assets/textures/' + character + '.gif)');
    }
    return elmt;
  };

  var processCell = function(selected, update) {
    if (selected === undefined || selected === null) {
      selected = selectedGridOption();
    }

    if (update === undefined || update === null) {
      update = true;
    }

    if (selected.length == 0) {
      $('#error-area').html('Сначала выберите материал');
    } else {
      $(this)
          .html('')
          .data('character', selected.data('character'))
          .append(getTextureImg(selected.data('character')).width(cellSize).height(cellSize));

      if (update && isAutoUpdate()) {
        simulate();
      }
    }
  };

  var getLayoutStr = function() {
    var layout = "";
    $('.grid-table td.contents').each(function() {
      if ($(this).data('character') === undefined) {
        layout += 'O';
      } else {
        layout += $(this).data('character');
      }
    });
    return layout;
  };

  var augmentResponse = function(response) {
    var reactorParams = $('#reactor-area').data();
    response = $.extend({}, response);

    response.output *= modpackConfig.powerProductionMultiplier;
    response.fuelConsumption *= modpackConfig.fuelUsageMultiplier;
    response.outputIngotConsumption = response.fuelConsumption * 20 * 60 / 1000

    var output = response.output;
    var fuelUse = response.fuelConsumption;
    var fuelEff = output / fuelUse;

    response.outputPerFuel = output / fuelUse;
    var volume = (reactorParams.x + 2) * (reactorParams.z + 2) * (reactorParams.height + 2);

    response.outputPerBlock = output / volume;
    response.outputPerFuelPerBlock = fuelEff / volume;

    $.each(response, function(k, v) {
      response[k] = addCommas(Math.round(v * 100) / 100);
    });

    return response;
  };

  var displaySimulationResponse = function(response) {
    $('#error-area').html('');
    response = augmentResponse(response);
    $('li', $('#simulation-results')).each(function() {
      $('.value', this).html(response[$(this).data('for')]);
    });
    $('.loading-animation.simulation').hide();
  };

  var validateReactorSize = function() {
    try {
      var x = parseInt($('#length').val());
      var z = parseInt($('#width').val());
      var height = parseInt($('#height').val());

      if (isNaN(x) || isNaN(z) || isNaN(height)) {
        return "Неверный ввод";
      } else if (x < MIN_SIZE || x > MAX_SIZE || z < MIN_SIZE || z > MAX_SIZE) {
        return "Длина и ширина должны быть от " + MIN_SIZE + " до " + MAX_SIZE;
      } else if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
        return "Высота должна быть от " + MIN_HEIGHT + " до " + MAX_HEIGHT;
      }
    } catch (e) {
      return "Неверный ввод";
    }

    return true;
  };

  var validateReactor = function() {
    var hasControlRods = $('.grid-table td.contents')
        .filter(function() { return $(this).data('character') === 'X' })
        .length > 0;

    if (!hasControlRods) {
      return "В реакторе должен быть хотя бы один управляющий стержень.";
    }

    return true;
  };

  var buildDefinition = function() {
    var reactorArea = $('#reactor-area')
        , params = reactorArea.data();

    return {
      xSize: params.z + 2,
      zSize: params.x + 2,
      height: params.height + 2,
      layout: getLayoutStr(),
      isActivelyCooled: params.activelyCooled,
      controlRodInsertion: params.controlRodInsertion
    };
  };

  var loading = $('.loading-animation.simulation');

  var handleErrorResponse = function(jqhxr, textStatus, err) {
    var error;
    if (err == 'Bad Gateway') {
      error = 'API не отвечает. Возможно, идет перезагрузка.';
    } else if (jqhxr.status == 429) {
      error = 'Слишком много запросов. Пожалуйста, подождите.';
    } else {
      error = textStatus + ", " + err;
    }
    $('#error-area').html(error);
    loading.hide();
  };

  var simulate = function() {
    var validationResult = validateReactor()
        , definition = buildDefinition();

    if (validationResult !== true) {
      $('#error-area').html(validationResult);
      $('#simulation-results .value').html('-');
    } else {
      loading.show();

      if (window.location.origin === 'file://' || window.location.hostname.includes('github.io')) {
        displaySimulationResponse(SAMPLE_RESPONSE);
        $('#error-area').html('<span style="color:#888; font-size:12px;">Статический режим (API отключено)</span>');
      } else {
        $.getJSON('/api/simulate', {definition: JSON.stringify(definition)})
            .done(displaySimulationResponse)
            .fail(handleErrorResponse);
      }
    }
    calculateCost();
  };

  var calculateCost = function() {
    var params = $('#reactor-area').data()
        , width = params.x
        , length = params.z
        , height = params.height
        , materialCounts = {}
        , totalCosts = [];

    $('.grid-table td.contents').each(function(i, e) {
      var c = $(e).data('character');

      if (c) {
        materialCounts[c] |= 0;
        materialCounts[c] += height;
      }
    });

    $.each(materialCounts, function(k,v) {
      if (k == 'O') return;

      var material = $('.grid-option')
          .filter(function() { return $(this).data('character') == k; })
          .data(),
          c = { material: material, count: v };

      if (k == 'X') {
        c.material = materials.fuelRod;
        c.children = calculateMaterialCost(c);
      } else {
        c.children = calculateInteriorCost(c);
      }
      totalCosts.push(c);
    });

    var exWidth = (width + 2)
        , exLength = (length + 2)
        , numRods = $('.grid-table .contents').filter(function () { return $(this).data('character') == 'X'; }).length
        , casingCount =
            (exWidth * exLength * 2)
            + (exWidth * height * 2)
            + (length * height * 2)
            - numRods
            - 1;

    var casingCost = [
      { material: materials.reactorCasing, count: casingCount },
      { material: materials.reactorController, count: 1 }
    ];

    if (numRods > 0) {
      casingCost.push({ material: materials.controlRod, count: numRods });
    }

    $.each(casingCost, function(i, e) {
      e.children = calculateMaterialCost(e);
      totalCosts.push(e);
    });

    if (costMode == costModes.totals) {
      totalCosts = collapseCosts(totalCosts);
    } else {
      totalCosts.sort(function(a, b) {
        a = a.material.name;
        b = b.material.name;
        if (a < b) return -1;
        else if (b < a) return 1;
        else return 0;
      });
    }

    var costsArea = $('#costs-area')
        , costsList = $('> ul', costsArea);

    if (costsList.length == 0) {
      costsList = $('<ul></ul>');
      costsArea.append(costsList, totalCosts);
    } else {
      renderCosts(costsList, totalCosts);
    }
  };

  var renderCosts = function(base, costs) {
    $('> li', base).removeData('present');

    $.each(costs, function(i, e) {
      var elem = $('> li', base).filter(function () { return $(this).data('material') == e.material.name; }), label;

      if (elem.length == 0) {
        elem = $('<li></li>').addClass('costs-item').data('material', e.material.name).data('present', true);

        var bgUrl;
        if (e.material.character) bgUrl = 'textures/' + e.material.character;
        else bgUrl = 'icons/' + e.material.key;

        var icon = $('<div></div>').addClass('texture').css({backgroundImage: 'url(assets/' + bgUrl + '.gif)'});
        label = $('<span></span>').addClass('material-label').addClass('collapsed').append(e.material.name).append($('<span></span>').addClass('material-count').html(addCommas(e.count)));

        elem.append(icon).append(label);
        base.append(elem);
      } else {
        $('.material-count', elem).html(addCommas(e.count));
        elem.data('present', true);
      }

      if (e.children && e.children.length > 0) {
        var childrenBase = $('> ul', elem);

        if (childrenBase.length == 0) {
          childrenBase = $('<ul></ul>');
          label.addClass('parent');
          elem.append(childrenBase);
        }
        renderCosts(childrenBase, e.children);
      }
    });

    $('> li', base).filter(function() { return !$(this).data('present'); }).remove();
    return base;
  };

  var calculateInteriorCost = function(cost) {
    var materialCost = [];
    $.each(reactorContentsMaterials[cost.material.character], function (i, e) {
      var c = { material: e[0], count: e[1]*cost.count };
      c.children = calculateMaterialCost(c);
      materialCost.push(c);
    });
    return materialCost;
  };

  var calculateMaterialCost = function(cost) {
    var materialCost = [];
    if (materialCosts[cost.material.key]) {
      var recipe = materialCosts[cost.material.key];
      $.each(recipe.ingredients, function (i, e) {
        var c = { material: e[0], count: Math.ceil((e[1] * cost.count) / recipe.numYield) };
        c.children = calculateMaterialCost(c);
        materialCost.push(c);
      });
    }
    return materialCost;
  };

  var collapseCosts = function(costs) {
    var collapsedCosts = {}
        , addCosts = function(e) {
          if (!collapsedCosts[e.material.key]) {
            collapsedCosts[e.material.key] = e;
          } else {
            collapsedCosts[e.material.key].count += e.count;
          }
        };

    $.each(costs, function(i, e) {
      if (e.children && e.children.length > 0) {
        $.each(collapseCosts(e.children), function(i, child) {
          addCosts(child);
        });
      } else {
        addCosts(e);
      }
    });

    var sortedKeys = Object.keys(collapsedCosts).sort()
        , flattenedCosts = [];

    $.each(sortedKeys, function(i, e) {
      flattenedCosts.push(collapsedCosts[e]);
    });

    return flattenedCosts;
  };

  $(function() {
    setSizes();
    $(window).resize(setSizes);

    $.each(gridOptions, function(i, e) {
      var elmt = $('<div class="grid-option"></div>')
          .data('character', e.character)
          .data('name', e.name);
      elmt.append(getTextureImg(e.character));
      $('#controls-grid').append(elmt);
    });

    $.each(modpackConfigs, function(k, config) {
      var modpack = modpacks[k]
          , elem = $('<li></li>')
              .data('option', modpack.key)
              .html(modpack.name);

      if (modpack == modpacks.defaults) {
        elem.addClass('active');
      }

      $('#modpack').append(elem);
    });

    $('#modpack').on('modeChange', function(e, option) {
      modpackConfig = modpackConfigs[option];
      updateHashParams({modpack: option});
      simulate();
    });

    $('#new-reactor').click(function() { showPage('reactor-prompt'); });
    $('#create-reactor').click(function() { $('#reactor-prompt-form').submit(); });

    $('#reactor-prompt-form').submit(function() {
      var validationResult = validateReactorSize();

      if (validationResult === true) {
        var length = $('#length').val()
            , width = $('#width').val()
            , height = $('#height').val()
            , activelyCooled = $('#activelyCooled').is(':checked')
            , controlRodInsertion = $('#control-rod-insertion').slider('value');

        createReactor(length, width, height, activelyCooled, controlRodInsertion);

        previousPage = 'reactor-design';

        showPage('reactor-design', {
          length: length,
          width: width,
          height: height,
          activelyCooled: activelyCooled,
          controlRodInsertion: controlRodInsertion
        });
      } else {
        $('#error-area').html(validationResult);
      }
      return false;
    });

    $('.grid-option').click(function() {
      selectGridOption($(this).data('character'));
    });

    var dragging = false
        , stopDragging = function() {
          if (dragging) {
            dragging = false;
            updateHashParams({layout: rlencode(getLayoutStr())});
            if (isAutoUpdate()) simulate();
          }
          return false;
        };

    $('body')
        .on('mousedown', '.grid-table td.contents', function (evt) {
          if (evt.shiftKey) {
            selectGridOption($(this).data('character'));
            evt.preventDefault();
            return true;
          }
          dragging = true;
          processCell.call(this);
          updateHashParams({layout: rlencode(getLayoutStr())});
        })
        .on('mouseup', '.grid-table', stopDragging)
        .on('mouseenter', '.grid-table td.contents',
          function() {
            if (!dragging) {
              $(this).addClass('selected');
            } else {
              processCell.call(this, null, false);
            }
          })
        .on('mouseleave', '.grid-table td.contents', function() { $(this).removeClass('selected'); })
        .on('mouseleave', '.grid-table', stopDragging);

    $('#fill').click(function() {
      $('.grid-table td.contents').each(function() { processCell.call(this, null, false); });
      updateHashParams({layout: rlencode(getLayoutStr())});
      if (isAutoUpdate()) {
        simulate();
      }
    });

    $('#simulate').click(simulate);

    $('#new-design-cancel').click(function() {
      window.history.back();
    });

    $('#activelyCooled').change(function() {
      var activelyCooled = $(this).prop('checked');
      updateReactor({activelyCooled: activelyCooled });
    });

    $('.checkbox-label').click(function() {
      var c = $('input[type="checkbox"]', $(this).parent());
      c.prop('checked', !c.is(':checked'));
      c.trigger('change');
      return false;
    });

    var updateRodInsertion = function(value, isUpdateReactor) {
      $('#control-rod-insertion-value').html(value + '%');
      $('#control-rod-insertion').slider('value', value);
      if (isUpdateReactor) {
        updateReactor({controlRodInsertion: value});
      }
    };

    var optimizeInsertion = function() {
      var validationResult = validateReactor()
          , definition = buildDefinition();

      if (validationResult !== true) {
        $('#error-area').html(validationResult);
        $('#simulation-results .value').html('-');
      } else {
         if (window.location.origin === 'file://' || window.location.hostname.includes('github.io')) {
             updateRodInsertion(50, true); // Mock optimization
             $('#optimize-control-rod').button('reset');
         } else {
            $.getJSON('/api/optimize_insertion', {definition: JSON.stringify(definition)})
                .done(function(result) {
                  updateRodInsertion(result, true);
                  $('#optimize-control-rod').button('reset');
                })
                .fail(handleErrorResponse);
         }
      }
    };

    $('#optimize-control-rod').click(function() {
      $(this).button('loading');
      optimizeInsertion();
    });

    var updateReactorHeight = function(h) {
      if (h < MIN_HEIGHT) {
        $('#error-area').html('Меньше нельзя');
      } else if (h > MAX_HEIGHT) {
        $('#error-area').html('Больше нельзя');
      } else {
        updateReactor({height:h});
      }
    };

    $('#control-rod-insertion').slider({
      min: 0, max: 100, value: 0, step: 1,
      slide: function (e, ui) { updateRodInsertion(ui.value, false); },
      stop: function (e, ui) { updateRodInsertion(ui.value, true); }
    });

    $('body').on('click', '.costs-item', function() {
      if ($('> ul', this).toggle().is(':visible')) {
        $('> .material-label', this).removeClass('collapsed');
      } else {
        $('> .material-label', this).addClass('collapsed');
      }
      return false;
    });

    $('#costs-mode').on('modeChange', function(e, mode) {
      costMode = costModes[mode];
      calculateCost();
    });

    var parseReactorParams = function() {
      var params = getHashParams();
      if (params.modpack && modpackConfigs[params.modpack]) {
        modpackConfig = modpackConfigs[params.modpack];
        $('#modpack > li')
            .removeClass('active')
            .filter(function() { return $(this).data('option') == params.modpack; })
            .addClass('active');
      }

      if (getHashLocation() == 'reactor-design') {
        createReactor(params.length, params.width, params.height, params.activelyCooled, params.controlRodInsertion);

        $('#control-rod-insertion').slider('value', params.controlRodInsertion);
        $('#control-rod-insertion-value').html(params.controlRodInsertion + '%');
        $('#activelyCooled').prop('checked', JSON.parse(params.activelyCooled));

        if (params.layout !== undefined) {
          var decodedLayout = rldecode(params.layout);
          var gridCells = $('.grid-table td.contents');

          for (var i = 0; i < decodedLayout.length; i++) {
            var char = decodedLayout[i]
                , gridOption = $('.grid-option').filter(function () {
                  return $(this).data('character') == char;
                }).first();

            if (gridOption.length > 0) {
              processCell.call(gridCells.eq(i), gridOption, false);
            }
          }
          simulate();
        }
      }
    };
    var previousPage = getHashLocation();

    $(window).load(parseReactorParams);
    $(window).hashchange(function() {
      if (previousPage != 'reactor-design') {
        parseReactorParams();
      }
      previousPage = getHashLocation();
    });

    $('#auto-update').bootstrapSwitch({
      size: 'small',
      labelText: 'Авто-Обновление',
      labelWidth: '100px',
      inverse: true
    });

    $('.control-rod-plusminus').plusminus({
      callback: function(value) {
        var slider = $('#control-rod-insertion')
            , newValue = Math.max(0, Math.min(100, value + slider.slider('value')));
        slider.slider('value', newValue);
        updateRodInsertion(newValue, true);
      }
    });

    $('.live-height-plusminus').plusminus({
      value: 0,
      callback: function(value) {
        var newHeight = $('#reactor-area').data('height') + value;
        updateReactorHeight(newHeight);
      }
    })
  });
})(jQuery);