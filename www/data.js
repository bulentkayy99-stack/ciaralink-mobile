// CiaraLink Shared Data Store — localStorage wrapper
// Usage: AegisData.push('sent_referrals', item)  /  AegisData.get('notes')
window.AegisData = (function(){
  var PREFIX = 'ciaralink_';
  function key(k){ return PREFIX + k; }
  return {
    get: function(k){
      try{ return JSON.parse(localStorage.getItem(key(k)) || 'null'); }catch(e){ return null; }
    },
    set: function(k, val){
      try{ localStorage.setItem(key(k), JSON.stringify(val)); }catch(e){}
    },
    push: function(k, item){
      var arr = this.get(k) || [];
      arr.unshift(item);
      this.set(k, arr.slice(0, 100));
    },
    remove: function(k, id){
      var arr = (this.get(k) || []).filter(function(x){ return x._id !== id; });
      this.set(k, arr);
    },
    clear: function(k){ try{ localStorage.removeItem(key(k)); }catch(e){} },
    now: function(){
      var d = new Date();
      return d.toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'});
    },
    uid: function(){
      return Math.random().toString(36).slice(2,8).toUpperCase();
    }
  };
})();
