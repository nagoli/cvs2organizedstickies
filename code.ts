// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).



// Hit Ctrl-Shift-B in Windows, or Command-Shift-B for Mac.
// Select watch-tsconfig.json



const HORIZONTAL:string='H';
const VERTICAL:string='V'; 

// specify configuration as json data 
let Config = {
  "DATA_HEADERS": ["profile", "tool", "page", "fonctionnality", "type", "comment", "level"],
  "TOP_NAME": "Retours par pages",
  "SECTION_HEADERS": ["tool", "page", "fonctionnality"],
  "SECTION_DIRECTIONS": ["H", "V", "H"],
  "STICKY_DIRECTION": "V",
  "STICKY_CONTENT_HEADER": "comment",
  "STICKY_COLOR_HEADER": "type",
  "STICKY_COLOR_MAP": {
    "Positif": "lightgreen",
    "Neutre": "lightyellow",
    "Négatif": "lightpink"
  },
  "STICKY_AUTHOR_HEADER": "profile",
  "HEADER_SPLITER": "\t",
  "LINE_SPLITER": "\n"
}



function printConfig(){
  console.log('DATA_HEADERS:', Config.DATA_HEADERS);
  console.log('TOP_NAME:', Config.TOP_NAME);
  console.log('SECTION_HEADERS:', Config.SECTION_HEADERS);
  console.log('SECTION_DIRECTIONS:', Config.SECTION_DIRECTIONS);
  console.log('STICKY_DIRECTION:', Config.STICKY_DIRECTION);
  console.log('STICKY_CONTENT_HEADER:', Config.STICKY_CONTENT_HEADER);
  console.log('STICKY_COLOR_HEADER:', Config.STICKY_COLOR_HEADER);
  console.log('STICKY_COLOR_MAP:', JSON.stringify(Config.STICKY_COLOR_MAP));
  console.log('STICKY_AUTHOR_HEADER:', Config.STICKY_AUTHOR_HEADER);
  console.log('HEADER_SPLITER:', Config.HEADER_SPLITER);
  console.log('LINE_SPLITER:', Config.LINE_SPLITER);
}

if (true){
   Config = {
    "DATA_HEADERS": ["profile", "type", "category", "comment"],
    "TOP_NAME": "Retours synthétiques",
    "SECTION_HEADERS": ["category", "type"],
    "SECTION_DIRECTIONS": ["VERTICAL", "HORIZONTAL"],
    "STICKY_DIRECTION": "HORIZONTAL",
    "STICKY_CONTENT_HEADER": "comment",
    "STICKY_COLOR_HEADER": "type",
    "STICKY_COLOR_MAP": {
      // @ts-ignore
      "Freins": "pink",
      "Risques": "red",
      "Killer Feature": "green"
    },
    "STICKY_AUTHOR_HEADER": "profile"
  }
}


async function loadfonts(){
  await figma.loadFontAsync({ family: "Inter", style: "Medium" }) ;
}

function clone(val:any) :any {
  const type = typeof val
  if (val === null) {
    return null
  } else if (type === 'undefined' || type === 'number' ||
             type === 'string' || type === 'boolean') {
    return val
  } else if (type === 'object') {
    if (val instanceof Array) {
      return val.map(x => clone(x))
    } else if (val instanceof Uint8Array) {
      return new Uint8Array(val)
    } else {
      let o = {}
      for (const key in val) {
        // @ts-ignore
        o[key] = clone(val[key])
      }
      return o
    }
  }
  throw 'unknown'
}

//interface for a class using data headers
class Data extends Map<string,string> {

  toString() : string{
    let s = "Data : ";
    Config.DATA_HEADERS.forEach(h=> s+= "   "+ h + " : " +this.get(h));
    return s;
  }
}



function createDataFromString(sString: string) : Data {
  let data = new Data();
  let elts = sString.split(Config.HEADER_SPLITER);
  let headers = Config.DATA_HEADERS;
  for (let i = 0; i < headers.length; i++) {
      if (!elts[i]) console.log("UNDEFINED at "+i+" in "+elts[i])
      else data.set(headers[i],elts[i].trim());
  }   
  return data;
}

function createDataListFromString(sString: string) : Data[] {
  let data: Map<string,string>[] =[];
  let elts = sString.split(Config.LINE_SPLITER);
  for (let i = 0; i < elts.length; i++) {
    //test if there is some content at that line  
    if (elts[i])
        data.push(createDataFromString(elts[i]));
  }
  return data;
}


//take a string in format : 
//Profil	Outil	Page	Fonctionnalité	Type de retour	Commentaire	Niveau du retour
// and create a sticky note with Fonctionnalité and Commentaire 
function createStickyFromData(data: Data, x: number, y : number) {
  //create a sticky note with Fonctionnalité and Commentaire
  const sticky = figma.createSticky();
  sticky.x = x; // Position X sur le canvas
  sticky.y = y; // Position Y sur le canvas
  sticky.text.characters = data.get('fonctionnality') + ' : \n\n' + data.get('comment'); // Le texte du sticky note
}

function createStickyFromDataList(dataList : Data[], x:number, y:number) {
  for (let i = 0; i < dataList.length; i++) {
      createStickyFromData(dataList[i], x, y);
  }
}

const STICKY_PARENT = 2;
const SECTION_PARENT = 1; 
const SIZE_STICKY = 240;
const SIZE_MARGIN_STICKY = 48;
const SIZE_MARGIN_SECTION = 60;
const MAX_WIDTH_STICKY_PARENT = 1;
const MAX_HEIGHT_STICKY_PARENT = 1;


//class for holding structured Data
class DataTree {


  name : string;
  children : Map<string, DataTree> ;
  dataList : Data[];
  type : number = SECTION_PARENT;
  width : number =0;
  height : number =0;
  level : number =0;


  // Constructor to initialize the attributes 
  constructor(level?: number, name?: string, dataList? : Data[]) {
    this.level=level || 0;
    this.name = name || Config.TOP_NAME;
    this.dataList = dataList || [];
    this.children= new Map();
  }

  addData(item : Data) {
    this.dataList.push(item);
  }


  // return a table structuring the data according to the given sequence
  buildTree(){
    console.log("create "+this.name);

    const childrenHeader = Config.SECTION_HEADERS[this.level] ;
    

    //for each line of dataList check the data[item] if it is in sequence
    console.log(childrenHeader)
    for (let i = 0; i < this.dataList.length; i++) {    
      const data = this.dataList[i];
      //console.log("read "+data.toString());
      let branchName = data.get(childrenHeader);
      if (!branchName) {
        console.error("PLUGIN -- undefined item "+childrenHeader+" in "+data + "position "+ i);
        break;
      }
      let branch ;
      if (this.children.has(branchName)) {
          branch = this.children.get(branchName);
      } else {
          branch = new DataTree(this.level+1, branchName);
          this.children.set(branchName, branch);
          //console.log("create "+branchName);
      }
      if(branch) branch.addData(data);
      //console.log("added ");
    }

    if (this.level < Config.SECTION_HEADERS.length-1) {
        for (let [key, value] of this.children) {
            value.buildTree();
            console.log(Config.SECTION_HEADERS[this.level] + " list added to "+key);
        }
    } 
    else {
        for (let [key, value] of this.children) {
          value.setAsSticky();
        }
    }
  }

  setAsSticky(){
    this.type=STICKY_PARENT;
  }

  getChildrenCount() : number {
    if (this.type==STICKY_PARENT){
      return this.dataList.length; 
    }
    return this.children.size;
  }


  calculateSize(){
    const nb = this.getChildrenCount();
    const nbCeil = Math.ceil(nb / 3);
    if (this.type==STICKY_PARENT){
      if (Config.STICKY_DIRECTION==HORIZONTAL){
        this.width = nb * SIZE_STICKY + (nb+1)*SIZE_MARGIN_STICKY;
        this.height = SIZE_STICKY + 2*SIZE_MARGIN_STICKY;
      }else{
        this.width = SIZE_STICKY + 2*SIZE_MARGIN_STICKY;
        this.height = nb * SIZE_STICKY + (nb+1)*SIZE_MARGIN_STICKY;
      }
    }
    if (this.type==SECTION_PARENT){
      let maxHeight = 0;
      let maxWidth = 0 ;
      let widthSum = 0;
      let heightSum = 0;
      //begins calculus by the leaves
      this.children.forEach((value,key)=> {
        value.calculateSize();
        if (value.height>maxHeight) maxHeight= value.height;
        if (value.width>maxWidth) maxWidth= value.width;
        widthSum += value.width;
        heightSum += value.height;
      });
      if (Config.SECTION_DIRECTIONS[this.level]==HORIZONTAL){
        this.height= maxHeight + 2*SIZE_MARGIN_SECTION;
        this.width = widthSum + (this.children.size+1)*SIZE_MARGIN_SECTION;
      }else{
        this.width= maxWidth + 2*SIZE_MARGIN_SECTION;
        this.height = heightSum + (this.children.size+1)*SIZE_MARGIN_SECTION;
      }

    }
  }

  draw(x:number,y:number){
    const section = figma.createSection();
    section.resizeWithoutConstraints(this.width, this.height);
    section.name = this.name;
    section.x = x;
    section.y = y;
    if (this.type==SECTION_PARENT){
      let xChild =  SIZE_MARGIN_SECTION;
      let yChild =  SIZE_MARGIN_SECTION;
      this.children.forEach((value,key)=> {
        const childSection = value.draw(xChild, yChild);
        section.appendChild(childSection);
        //console.log("position after append = " + childSection.x + childSection.y);
        if (Config.SECTION_DIRECTIONS[this.level]==HORIZONTAL){
          xChild += SIZE_MARGIN_SECTION + value.width;
        }else{
          yChild += SIZE_MARGIN_SECTION + value.height;
        }
      });
    }
    if (this.type==STICKY_PARENT){
      let xChild =  SIZE_MARGIN_STICKY;
      let yChild =  SIZE_MARGIN_STICKY;
      this.dataList.forEach(data=>{
        const sticky = figma.createSticky();
        section.appendChild(sticky);
        sticky.x = xChild; // Position X sur le canvas
        sticky.y = yChild; // Position Y sur le canvas
        sticky.text.characters = ""+data.get(Config.STICKY_CONTENT_HEADER)+"\n ("+ data.get(Config.STICKY_AUTHOR_HEADER)+")";
        sticky.text.fontSize=20;
        if (Config.STICKY_DIRECTION==HORIZONTAL){
          xChild += SIZE_MARGIN_STICKY + SIZE_STICKY;
        }else{
          yChild += SIZE_MARGIN_STICKY + SIZE_STICKY;
        }
        sticky.authorVisible=false;
        // @ts-ignore
        const color = Config.STICKY_COLOR_MAP[''+data.get(Config.STICKY_COLOR_HEADER)];
        if (color){
          const fills = clone(sticky.fills);
          fills[0].color = figma.util.rgb(color);
          sticky.fills=fills;
        }
      });


    }
    //console.log("position before append = " + section.x + section.y);
    return section;

  }


}

// Runs this code if the plugin is run in Figma
if (figma.editorType === "figma") {


  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  figma.closePlugin();
}
// Runs this code if the plugin is run in FigJam
if (figma.editorType === "figjam") {
  console.log("run in figjam");
  figma.loadFontAsync({ family: "Inter", style: "Medium" }).then( () => {
    console.log("font loaded");
    figma.showUI(__html__, { width: 400, height: 600 });

    // This shows the HTML page in "ui.html".


    
    figma.ui.onmessage =  (msg: {type: string, content: string}) => {

      if (msg.type === 'read-file') {
          const dataList = createDataListFromString(msg.content);
          let tree = new DataTree(0,Config.TOP_NAME,dataList);
          tree.buildTree();
          tree.calculateSize();
          const topSection = tree.draw(0,0);
          figma.currentPage.selection = [topSection];
          figma.viewport.scrollAndZoomIntoView([topSection])
          //figma.closePlugin();
      }

      if (msg.type === 'submit') {
          eval(msg.content);
          console.log("Take new configuration into account : \n"+msg.content);

      }
       
      if (msg.type === 'print-config'){
          printConfig();
          return;
      }
      


    };
    
    // Make sure to close the plugin when you're done. Otherwise the plugin will
    // keep running, which shows the cancel button at the bottom of the screen.
  });

}