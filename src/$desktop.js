
var $desktop = $(".desktop");
$desktop.attr("touch-action", "none");

var grid_size_x = 75;
var grid_size_y = 75;

function $DesktopIcon(options){
	var $container = $("<div class='desktop-icon' draggable='true'/>").appendTo($desktop);
	var $icon_wrapper = $("<div class='icon-wrapper'/>").appendTo($container).width(DESKTOP_ICON_SIZE).height(DESKTOP_ICON_SIZE);
	var $icon = $Icon(options.icon || "task", DESKTOP_ICON_SIZE).width(DESKTOP_ICON_SIZE).height(DESKTOP_ICON_SIZE);
	var $selection_effect = $icon.clone().addClass("selection-effect");
	
	var $title = $("<div class='title'/>").text(options.title);
	$container.append($icon_wrapper, $title);
	$icon_wrapper.append($icon, $selection_effect);
	$container.on("dblclick", function(){
		options.open();
	});
	$container.on("pointerdown", function(){
		$desktop.find(".desktop-icon").removeClass("selected focused");
		$container.addClass("selected focused");
	});
	if(options.shortcut){
		$container.addClass("shortcut");
	}
	return $container;
}

// TODO: sort (by name I guess)
var arrange_icons = function(){
	var x = 0;
	var y = 0;
	// $desktop.find(".desktop-icon")
	// .toArray()
	// .sort(function(a, b){
	// 	return (
	// 		$(a).find(".title").text().toLowerCase() >
	// 		$(b).find(".title").text().toLowerCase()
	// 	);
	// })
	// .forEach(function(el){
	// 	$(el).css({
	$desktop.find(".desktop-icon").each(function(){
		$(this).css({
			position: "absolute",
			width: grid_size_x,
			height: grid_size_y,
			left: x,
			top: y,
		});
		y += grid_size_y;
		if(y + grid_size_y > innerHeight){
			x += grid_size_x;
			y = 0;
		}
	});
};

// NOTE: in Windows, icons normally only get moved if they go offscreen (by maybe half the grid size)
// we're essentially handling it as if Auto Arrange is on
$G.on("resize", arrange_icons);

// Handle selecting icons on the desktop
(function(){
	var $marquee = $("<div class='marquee'/>").appendTo($desktop).hide();
	var start = {x: 0, y: 0};
	var current = {x: 0, y: 0};
	var dragging = false;
	var drag_update = function(){
		var min_x = Math.min(start.x, current.x);
		var min_y = Math.min(start.y, current.y);
		var max_x = Math.max(start.x, current.x);
		var max_y = Math.max(start.y, current.y);
		$marquee.show().css({
			position: "absolute",
			left: min_x,
			top: min_y,
			width: max_x - min_x,
			height: max_y - min_y,
		});
		$desktop.find(".desktop-icon").removeClass("selected").each(function(i, container){
			var rect = container.getBoundingClientRect();
			if(
				rect.left < max_x &&
				rect.top < max_y &&
				rect.right > min_x &&
				rect.bottom > min_y
			){
				$(container).addClass("selected");
			}
		});
	};
	$desktop.on("pointerdown", function(e){
		// TODO: allow a margin of mouse movement before starting selecting
		var desktop_was_focused = $desktop.hasClass("focused");
		$desktop.addClass("focused");
		var $icon = $(e.target).closest(".desktop-icon");
		$marquee.hide();
		start = {x: e.clientX, y: e.clientY};
		current = {x: e.clientX, y: e.clientY};
		if($icon.length > 0){
			$marquee.hide();
		}else{
			dragging = true;
			// don't deselect right away unless the desktop was focused
			if(desktop_was_focused){
				drag_update();
			}
		}
	});
	$G.on("pointerdown", function(e){
		if($(e.target).closest(".desktop").length == 0){
			$desktop.removeClass("focused");
		}
	});
	$desktop.on("pointermove", function(e){
		current = {x: e.clientX, y: e.clientY};
		if(dragging){
			drag_update();
		}
	});
	$G.on("pointerup blur", function(){
		$marquee.hide();
		dragging = false;
	});
})();

// TODO: select icons with the keyboard

$G.on("keydown", function(e){
	if($desktop.is(".focused")){
		if(e.key == "Enter"){
			$desktop.find(".desktop-icon.selected").trigger("dblclick");
		}else if(e.ctrlKey && e.key == "a"){
			$desktop.find(".desktop-icon").addClass("selected");
		}
	}
});

// Prevent drag and drop from redirecting the page (the browser default behavior for files)
// TODO: only prevent if there are actually files; there's nothing that uses text inputs atm that's not in an iframe, so it doesn't matter YET (afaik)
$G.on("dragover", function(e){
	e.preventDefault();
});
$G.on("drop", function(e){
	e.preventDefault();
});

// TODO: allow dragging files off FROM the desktop, with dataTransfer.setData("DownloadURL", ...)
// sadly will only work for a single file (unless it secretly supports text/uri-list (either as a separate type or for DownloadURL))
$desktop.on("dragover", function(e){
	e.preventDefault();
});
var drop_file_on_desktop = function(file, x, y){

	var Buffer = BrowserFS.BFSRequire('buffer').Buffer;
	var fs = BrowserFS.BFSRequire('fs');

	var reader = new FileReader;
	reader.onerror = function(error){
		throw error;
	};
	reader.onload = function(e){
		var buffer = Buffer.from(reader.result);
		// fs.createFile(file.name, "wx", 0x777, function(error, bfs_file){
		// 	if(error){
		// 		throw error;
		// 	}
		// 	// could do utimes as well with file.lastModified or file.lastModifiedDate
		// 	bfs_file.write(buffer);
		// });
		fs.writeFile(file.name, buffer, {flag: "wx"}, function(error){
			if(error){
				if(error.code === "EEXIST"){
					// TODO: options to replace or keep both files with numbers like "file (1).txt"
					alert("File already exists!");
				}
				throw error;
			}
			alert("Wrote file!");
			// TODO: add file representation to the desktop
		});
	};
	reader.readAsArrayBuffer(file);
};
$desktop.on("drop", function(e){
	e.preventDefault();
	var files = e.originalEvent.dataTransfer.files;
	$.map(files, function(file){
		drop_file_on_desktop(file, e.pageX, e.pageY);
	});
});
