// Firebase Init + Data Layer
firebase.initializeApp({
  apiKey:"AIzaSyD-ZZFRkeldSPlsRs6UqIylwNfaojWTZTc",
  authDomain:"tilawah-link-academy.firebaseapp.com",
  projectId:"tilawah-link-academy",
  storageBucket:"tilawah-link-academy.firebasestorage.app",
  messagingSenderId:"924154130867",
  appId:"1:924154130867:web:61d9e3009d619067dc9bc6"
});
var db=firebase.firestore();
var stor=firebase.storage();

// Session locale (qui est connecté sur CE navigateur)
function getSession(){try{return JSON.parse(localStorage.getItem('tla_session'));}catch(e){return null;}}
function setSession(u){localStorage.setItem('tla_session',JSON.stringify(u));}
function clearSession(){localStorage.removeItem('tla_session');}

// Firestore: Users
async function fbGetAllUsers(){
  var snap=await db.collection('users').get();
  var arr=[];snap.forEach(function(d){arr.push(d.data());});return arr;
}
async function fbGetUser(uid){
  var doc=await db.collection('users').doc(uid).get();
  return doc.exists?doc.data():null;
}
async function fbSetUser(uid,data){
  await db.collection('users').doc(uid).set(data,{merge:true});
}
async function fbDeleteUser(uid){
  await db.collection('users').doc(uid).delete();
}
async function fbFindByPhone(phone){
  var snap=await db.collection('users').where('phone','==',phone).get();
  if(snap.empty)return null;
  var r=null;snap.forEach(function(d){r=d.data();});return r;
}
async function fbFindByLogin(id,pass){
  // Try phone
  var snap=await db.collection('users').where('phone','==',id).where('password','==',pass).get();
  if(!snap.empty){var r=null;snap.forEach(function(d){r=d.data();});return r;}
  // Try email
  snap=await db.collection('users').where('email','==',id).where('password','==',pass).get();
  if(!snap.empty){var r=null;snap.forEach(function(d){r=d.data();});return r;}
  return null;
}

// Firestore: Media metadata
async function fbGetAllMedia(){
  var snap=await db.collection('media').get();
  var arr=[];snap.forEach(function(d){arr.push(d.data());});return arr;
}
async function fbAddMedia(mid,data){
  await db.collection('media').doc(mid).set(data);
}
async function fbDeleteMedia(mid){
  await db.collection('media').doc(mid).delete();
}

// Storage: files
async function fbUploadFile(mid,file){
  var ref=stor.ref('media/'+mid);
  await ref.put(file);
  return await ref.getDownloadURL();
}
async function fbGetFileUrl(mid){
  try{return await stor.ref('media/'+mid).getDownloadURL();}catch(e){return null;}
}
async function fbDeleteFile(mid){
  try{await stor.ref('media/'+mid).delete();}catch(e){}
}

// Init admin if needed
async function initFirebaseDB(){
  var admin=await fbGetUser('admin');
  if(!admin){
    await fbSetUser('admin',{id:'admin',role:'admin',name:'Propriétaire',email:'admin@tilawahlink.academy',phone:'admin',password:'admin',status:'active',city:'Dakar',specs:[],publics:[],bio:'',avatar:''});
  }
}
