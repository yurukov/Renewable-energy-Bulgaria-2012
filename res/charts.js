(function() {

var dateFormat = d3.time.format("%d%m%y");
var dateFormatP = d3.time.format("%d.%m.%Y");
var axisFormat = d3.format("d");
var axisFormatPerc = d3.format("%");

oD=null;
cD=null;
pD=null;
mwD=null;
leafletC=null; 
filterBlock=true;

dc.leafletChart = function(parent, chartGroup) {
    var _chart = dc.baseChart({});
    var _filter;
    var _map;
    var _mc; 
    var _blockpopup=false;

    _chart.doRender = function() {
	_map = L.map('chart-map',{zoomAnimation:false}).setView([42.69,25.15], 7);

	L.tileLayer('http://{s}.tile.cloudmade.com/ef311d0827c74ca7a2e1bb68614b7ad3/998/256/{z}/{x}/{y}.png', {
		attribution: 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2012 CloudMade',
		minZoom:5,maxZoom:14
	}).addTo(_map);

	_mc = new L.MarkerClusterGroup({ maxClusterRadius: 40, disableClusteringAtZoom:10, spiderfyOnMaxZoom: false, showCoverageOnHover: false });
	_map.addLayer(_mc);
	_map.on("popupclose",function() {
		if (!_blockpopup) {
			_chart.filter(null);
			dc.redrawAll();
		}
		_blockpopup=false;
	});

        return _chart.doRedraw();
    };

    _chart.doRedraw = function(){
	var markersList=[];
	_mc.clearLayers();
	_chart.group().all().forEach(function(v,i) {
		markersList=markersList.concat(v.value.markers);
	});
	_mc.addLayers(markersList);

	if (!filterBlock)
		hashFilters();

        return _chart;
    };

    _chart.filter = function(_) {
        if (!arguments.length) return _filter; 

        if (_) {
            _filter = _;
            _chart.dimension().filter(_);
        } else {
            _filter = null;
            _chart.dimension().filterAll();
	    _map.closePopup();
        }

        return _chart;
    };

    _chart.getMap = function() {
	return _map;
    }

    _chart.blockpopup = function(_) {
	_blockpopup=  _==null;
    }

    return _chart.anchor(parent, chartGroup);
};

d3.tsv("data/vei_companies.tsv", function (D) {
	cD=D;
	init();
});

d3.tsv("data/vei_energy.tsv", function (D) {
	pD=D;
	init();
});

function init() {
	if (!cD || !pD)
		return;
		
	if (console) console.log("Loaded");

	oD = new Array();
	mwD = new Array();

	cD.forEach(function(d,i) {
		d.owner=false;
		for (j=0;j<oD.length;j++)
			if (oD[j].bulstat==d.bulstat) {
				d.owner = j;
				oD[j].veis.push(i);
				break;
			}
		if (d.owner==false) {
			d.owner = oD.length;
			var temp = new Array();	
			temp.bulstat=d.bulstat;
			temp.veis = [i];
			oD.push(temp);
		}
		d.iconUrl = "res/"+(d.type=="СЕ"? "icon_solar.png" : (d.type=="ВЕ"? "icon_wind.png":(d.type=="ВД"? "icon_hydro.png":(d.type=="БМ"||d.type=="СГ"||d.type=="ОГ"? "icon_methane_gas.png":"icon_geotherm.png"))));
	});
	
	cD.forEach(function(d,i) {
		d.vavejdane=dateFormat.parse(d.vavejdane);
		if (d.vavejdane.getFullYear()>2014)
			d.vavejdane.setFullYear(d.vavejdane.getFullYear()-100);
		d.moshtnost=+d.moshtnost;
		d.geo = d.geo.split(",");
		d.i=i;
		d.lines=false;

		d.marker = new L.Marker(new L.LatLng(d.geo[0], d.geo[1]),{
	  		title: d.vei+" "+__str["в"]+" "+d.vgrad,
			icon: new L.icon({"iconUrl":d.iconUrl,iconSize:[32, 32],iconAnchor:[16,0]}),
			clickable: true,
	 		draggable: false
		});
		d.marker.data=d;
		var content = "<center><b>"+d.vei+"</b></center><table cellpadding=0 cellspacing=2>"+
			"<tr><td><i>"+__str["Местоположение"]+":</i></td><td>"+d.vgrad+", "+d.vobshtina+"</td></tr>"+
			"<tr><td><i>"+__str["Открита"]+":</i></td><td>"+dateFormatP(d.vavejdane)+"</td></tr>"+
			"<tr><td><i>"+__str["Мощност"]+":</i></td><td>"+d.moshtnost+" MW "+"</td></tr>"+
			"<tr><td><i>"+__str["Собственик"]+":</i></td><td>"+d.firma+"</td></tr>"+
			"<tr><td><i>"+__str["Фирмен адрес"]+":</i></td><td>"+d.fgrad+", "+d.fobshtina+"</td></tr>"+
			"<tr><td><i>"+__str["БУЛСТАТ"]+":</i></td><td>"+d.bulstat+"</td></tr></table>";
		if (d.owner && oD[d.owner].veis.length>1) {
			var tempL = oD[d.owner].veis.length;
			content+="<br/>"+(tempL>2?(tempL-1)+" "+__str["други централи"]:__str["Една друга централа"])+" "+__str["на собственика"]+":<br/>";
			for (j=0;j<oD[d.owner].veis.length;j++)
				if (oD[d.owner].veis[j]!=i)
					content+="<a href='javascript:;' onclick='leafletC.filter("+oD[d.owner].veis[j]+"); leafletC.blockpopup(); cD["+oD[d.owner].veis[j]+"].marker.popup.openOn(leafletC.getMap()); leafletC.blockpopup(false); dc.redrawAll();'>"+
					"<img src='"+cD[oD[d.owner].veis[j]].iconUrl+"' alt='' title='"+cD[oD[d.owner].veis[j]].vei+"'/></a> ";
		}
		d.marker.popup=new L.popup()
				.setLatLng(d.marker.getLatLng())
    				.setContent(content);
		d.marker.on("click",function(e) { 
			if (leafletC.filter()==e.target.data.i) {
				leafletC.filter(false);
			} else {
				leafletC.filter(e.target.data.i);
				leafletC.blockpopup();
				e.target.popup.openOn(leafletC.getMap());
				leafletC.blockpopup(false);
			}
			dc.redrawAll();
		});
	});

	pD.forEach(function(d,iO) {
		d.original=+d.cord;
		d.mw=+d.mw;
		d.ot=dateFormat.parse(d.ot);
		d.do=dateFormat.parse(d.do);
		var ratelist = d.podni.split(',');
		delete d.podni;
		for (i=0;i<ratelist.length;i++)  {
			var temp = new Array();
			temp.date = new Date(d.ot.getTime()+(i*7*24+3)*3600*1000);
			temp.date.setHours(0);
			temp.mw=parseInt(ratelist[i]);
			temp.original=iO;
			temp.originalC=d.original;	
			mwD[mwD.length]=temp;
		} 
	});

	if (console) console.log("Parsed");

	var xf = crossfilter(mwD);

	// amounts by month of project start

	var mwByWeek = xf.dimension(function(d) { return d3.time.monday(d.date>new Date(2011, 11, 30)?d.date:new Date(2011, 11, 31))});
	var mwByWeekGroupCE = mwByWeek.group().reduceSum(function(d) { return d.date>new Date(2011, 11, 30) && cD[d.originalC].type=="СЕ"?d.mw:0; });
	var mwByWeekGroupBD = mwByWeek.group().reduceSum(function(d) { return d.date>new Date(2011, 11, 30) && cD[d.originalC].type=="ВД"?d.mw:0; });
	var mwByWeekGroupВЕ = mwByWeek.group().reduceSum(function(d) { return d.date>new Date(2011, 11, 30) && cD[d.originalC].type=="ВЕ"?d.mw:0; });
	var mwByWeekGroupOT = mwByWeek.group().reduceSum(function(d) { return d.date>new Date(2011, 11, 30) && cD[d.originalC].type!="СЕ" && cD[d.originalC].type!="ВД" && cD[d.originalC].type!="ВЕ"?d.mw:0; });
	dc.lineChart("#chart-mw-day")
		.width(950)
		.height(200)
		.transitionDuration(1000)
		.margins({top: 10, right: 10, bottom: 20, left: 50})
		.dimension(mwByWeek)
		.group(mwByWeekGroupCE)
		.x(d3.time.scale().domain([new Date(2011, 11, 24), new Date(2012, 11, 1)]))
		.round(d3.time.monday.round)
		.xUnits(d3.time.mondays)
		.elasticY(true)
		.yAxis(d3.svg.axis().tickFormat(axisFormat))
		.renderHorizontalGridLines(true)
		.renderVerticalGridLines(true)
		.renderArea(true)
		.stack(mwByWeekGroupВЕ)
		.stack(mwByWeekGroupBD)
		.stack(mwByWeekGroupOT)
		.brushOn(true);

		var mwType = xf.dimension(function(d) { return cD[d.originalC].type; });
    	var mwTypeGroup = mwType.group().reduceSum(function(d) { return d.mw; });
	dc.pieChart("#chart-mw-type")
		.width(210)
		.height(200)
		.transitionDuration(1000)
//		.colors(['#3182bd', '#bd3131', '#9ecae1', '#6baed6', '#d56a6a'])
//		.colorAccessor(function(d, i){ return d.data.key-1;})
		.radius(90)
		.innerRadius(20)
		.dimension(mwType) 
		.group(mwTypeGroup)
		.renderLabel(true)
		.label(function(d) { return typeMap[d.data.key]; })
		.renderTitle(true)
		.title(function(d) { return __str["От"]+" "+typeMap[d.data.key].toLowerCase()+" "+__str["са произведени"]+" "+d.value+" MWh"; });
	var mwDostavchik = xf.dimension(function(d) { return pD[d.original].dostavchik; });
    	var mwDostavchikGroup = mwDostavchik.group().reduceSum(function(d) { return d.mw; });
	dc.pieChart("#chart-dostavchik")
		.width(210)
		.height(200)
		.transitionDuration(1000)
//		.colors(['#3182bd', '#bd3131', '#9ecae1', '#6baed6', '#d56a6a'])
//		.colorAccessor(function(d, i){ return d.data.key-1;})
		.radius(90)
		.innerRadius(20)
		.dimension(mwDostavchik) 
		.group(mwDostavchikGroup)
		.renderLabel(true)
		.label(function(d) { return dostavchikMap[d.data.key]; })
		.renderTitle(true)
		.title(function(d) { return dostavchikMap[d.data.key]+" "+__str["са изкупили"]+" "+d.value+" MWh"; });
	var newByMonth = xf.dimension(function(d) {
		var res = d3.time.year(cD[d.originalC].vavejdane).getFullYear();
		if (res<1960)
			return 1995;
		if (res<1970)
			return 1996;
		if (res<1980)
			return 1997;
		if (res<1990)
			return 1998;
		if (res<2000)
			return 1999;
		return res;
	});
	var newByMonthGroup = newByMonth.group().reduce(
		function (p, v) {
			if (!p.counted[v.originalC]) {
				p.mw+=cD[v.originalC].moshtnost;
				p.counted[v.originalC]=1;
			} else
			if (p.counted[v.originalC]>0)
				p.counted[v.originalC]++;
			return p;
		},
		function (p, v) {
			if (p.counted[v.originalC] && p.counted[v.originalC]==1) {
				p.mw-=cD[v.originalC].moshtnost;
				delete p.counted[v.originalC];
			} else
			if (p.counted[v.originalC]>1)
				p.counted[v.originalC]--;
			return p;
		},
		function () {
		  return { mw:0, counted:[] };
		});
	dc.barChart("#chart-plant-created")
		.width(470)
		.height(150)
		.transitionDuration(1000)
		.margins({top: 10, right: 10, bottom: 20, left: 50})
		.dimension(newByMonth)
		.group(newByMonthGroup)
		.valueAccessor(function(p) { return p.value.mw; })
		.x(d3.scale.linear().domain([1995,2013]))
		.round(dc.round.round)
		.xAxis(d3.svg.axis().tickFormat(function(i) {
			if (i==2000)
				return __str["До"]+" 2000"; 
			if (i==1999)
				return "1990"; 
			if (i==1998)
				return "1980"; 
			if (i==1997)
				return "1970"; 
			if (i==1996)
				return __str["До"]+" 1960"; 
			return i;
		}))
		.renderHorizontalGridLines(true)
		.elasticY(true)
		.brushOn(true);

	var veis = xf.dimension(function(d) { return d.originalC; });
	var veisGroup = veis.group().reduce(
		function (p, v) {
			if (!p.indeses[v.originalC] || p.indeses[v.originalC]==0) {
				p.markers[p.markers.length]=cD[v.originalC].marker;
				p.indeses[v.originalC]=1;
			} else
				p.indeses[v.originalC]++;
			return p;
		},
		function (p, v) {
			if (p.indeses[v.originalC] && p.indeses[v.originalC]>0 ) {
				p.indeses[v.originalC]--;
				if (p.indeses[v.originalC]==0) {
					var i = p.markers.indexOf(cD[v.originalC].marker);
					if (i!=-1)
						p.markers.splice(i,1);
				}
			}
			return p;
		},
		function () {
		  return {markers:[], indeses:[]};
		});
	leafletC = dc.leafletChart()
		.dimension(veis) 
		.group(veisGroup);

	var veiCapacity = xf.dimension(function(d) { 
		var res;
		if (cD[d.originalC].moshtnost<0.125)
			res = Math.floor(cD[d.originalC].moshtnost*32); 
		else			
		if (cD[d.originalC].moshtnost<0.5)
			res = Math.floor(cD[d.originalC].moshtnost*8)+3; 
		else			
			res = Math.floor(cD[d.originalC].moshtnost*2)+6; 

		if (res<10)
			return res;
		if (res<16)
			return 10;
		if (res<106)
			return 11;
		return 12;
	});
	var veiCapacityGroup = veiCapacity.group().reduce(
		function (p, v) {
			if (!p.indeses[v.originalC] || p.indeses[v.originalC]==0) {
				p.count++;
				p.indeses[v.originalC]=1;
			} else
				p.indeses[v.originalC]++;
			return p;
		},
		function (p, v) {
			if (p.indeses[v.originalC] && p.indeses[v.originalC]>0 ) {
				p.indeses[v.originalC]--;
				if (p.indeses[v.originalC]==0)
					p.count--;
			}
			return p;
		},
		function () {
			return { count:0, indeses:[] };
		});
	dc.barChart("#chart-plant-capacity")
		.width(470)
		.height(150)
		.transitionDuration(1000)
		.margins({top: 10, right: 20, bottom: 20, left: 40})
		.dimension(veiCapacity)
		.group(veiCapacityGroup)
		.valueAccessor(function(p) { return p.value.count; })
		.x(d3.scale.linear().domain([0,13]))
		.round(dc.round.round)
		.xAxis(d3.svg.axis()
			.ticks(14)
			.tickFormat(function(i) {
			if (i<4)
				return Math.round(i/32*1000)/1000;
			if (i<7)
				return (i-3)/8;
			if (i==11)
				return "5";
			if (i==12)
				return "50";
			if (i==13)
				return "380";
			return (i-6)/2;
		}))
		.yAxisPadding(5)
		.renderHorizontalGridLines(true)
		.elasticY(true)
		.brushOn(true);

	var veiCapacityPercent = veiCapacity.group().reduce(
		function (p, v) {
			if (!p.indeses[v.original] || p.indeses[v.original]==0) {
				var days = Math.round((pD[v.original].do - pD[v.original].ot)/1000/24/3600);
				p.mw+=pD[v.original].mw;
				p.max+=cD[v.originalC].moshtnost*24*days;
				p.eff = p.max==0 || p.mw==0?0:p.mw/p.max;
				p.indeses[v.original]=1;
			} else
				p.indeses[v.original]++;
			return p;
		},
		function (p, v) {
			if (p.indeses[v.original] && p.indeses[v.original]>0 ) {
				p.indeses[v.original]--;
				if (p.indeses[v.original]==0) {
					var days = Math.round((pD[v.original].do - pD[v.original].ot)/1000/24/3600);
					p.mw-=pD[v.original].mw;
					p.max-=cD[v.originalC].moshtnost*24*days;
					p.eff = p.max==0 || p.mw==0?0:p.mw/p.max;
				}
			}
			return p;
		},
		function () {
			return { mw:0, max:0, eff:0, indeses:[] };
		});

	dc.barChart("#chart-mw-percent")
		.width(470)
		.height(150)
		.transitionDuration(1000)
		.margins({top: 10, right: 20, bottom: 20, left: 40})
		.dimension(veiCapacity)
		.group(veiCapacityPercent)
		.valueAccessor(function(p) { return p.value.eff; })
		.x(d3.scale.linear().domain([0,13]))
		.round(dc.round.round)
		.xAxis(d3.svg.axis()
			.ticks(14)
			.tickFormat(function(i) {
			if (i<4)
				return Math.round(i/32*1000)/1000;
			if (i<7)
				return (i-3)/8;
			if (i==11)
				return "5";
			if (i==12)
				return "50";
			if (i==13)
				return "380";
			return (i-6)/2;
		}))
		.yAxis(d3.svg.axis().tickFormat(axisFormatPerc))
		.yAxisPadding(.05)
		.renderHorizontalGridLines(true)
		.elasticY(true)
		.brushOn(false);

	if (console) console.log("Rendering...");
	dc.renderAll();

	if (console) console.log("Filtering...");
	filterBlock=false;
	filter(decodeFiltersURL(decodeURIComponent(window.location.hash)), true);
};

window.filter = function(filters,nohash) {
	var relocatemap=true;
	if (filters==null)
		dc.filterAll();
	else
		dc.chartRegistry.list().forEach(function(d, i) { 
			if (i<filters.length) 
				d.filter(filters[i]); 
			else
				d.filter(null); 
			if (i==4 && filters[i]!=null && filters[i]!=false && cD[filters[i]]) {
				leafletC.getMap().setView(cD[filters[i]].marker.getLatLng(),10); 
				cD[filters[i]].marker.popup.openOn(leafletC.getMap());
				relocatemap=false;
			}
		});
	if (!nohash)
		hashFilters();
	dc.redrawAll();
	if (relocatemap) {
		leafletC.getMap().closePopup();
		leafletC.getMap().setView([42.69,25.15], 7);
	}
};

window.reset = function() {
	filter();
};

var hashFilters = function() {
	window.location.hash=encodeFiltersURL(getFilters());
	var langL = document.getElementById("lang_link").href;
	if (langL.indexOf("#")!=-1)
		langL=langL.substring(0,langL.indexOf("#"));
	document.getElementById("lang_link").href=langL+window.location.hash;
}

var getFilters = function() {
	var filters=[];
	dc.chartRegistry.list().forEach(function(d, i) { filters[i]=d.filter(); });
	return filters;
};

window.encodeFiltersURL = function(filters) {
	filters.forEach(function(f, i) {
		if (f==null || f==false)
			filters[i]='';
		else if (f instanceof Array || f instanceof Object) {
			if (f[0] instanceof Date && f[1] instanceof Date)
				filters[i]="d"+Math.round(f[0].getTime()/86400000)+"_"+Math.round(f[1].getTime()/86400000);
			else if (!isNaN(parseFloat(f[0])) && !isNaN(parseFloat(f[1])))
				filters[i]=Math.round(parseFloat(f[0])*100)/100+"_"+Math.round(parseFloat(f[1])*100)/100;
		} else if (!isNaN(parseFloat(f)))
			filters[i]=Math.round(parseFloat(f)*100)/100;
		else
			filters[i]=(""+f).replace(/\_/g,"\\_");
	});
	var f = filters.join("|");
	if (f.replace(/\|/g,"")=="")
		f="|";
	return f;
};

window.decodeFiltersURL = function(hash) {
	if (hash==null || hash=="" || hash=="#")
		return null;
	if (hash[0]=="#")
		hash=hash.substr(1);
	hash=hash.split("|");
	var filters = [];
	hash.forEach(function(h, i) {
		if (h=="")
			filters[i]=null;
		else if (h.indexOf("_")!=-1 && h.indexOf("\\_")==-1) {
			h=h.split("_");
			if (h[0][0]=="d") {
				filters[i]=[new Date((parseInt(h[0].substr(1)))*86400000), new Date((parseInt(h[1]))*86400000) ];
				filters[i][0].setHours(0); filters[i][1].setHours(0);
			}
			else if (!isNaN(parseFloat(h[0])))
				filters[i]=[parseFloat(h[0]), parseFloat(h[1])];
		} else if (!isNaN(parseFloat(h)))
			filters[i]=parseFloat(h);
		else 
			filters[i]=(""+h).replace(/\\\_/g,"_");
	});
	return filters;
};


})();
