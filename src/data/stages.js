/* stages.js — the five moments, and which motions apply at each.
   Welcome, Find, Act, Confirm, Complete. Journey-agnostic.

   opts lists valid patterns per element kind at that stage. Order does not
   matter: the engine sorts by distance from the stage's volume target. */

window.STAGES = {
  Welcome: { label:"A Welcome", plain:"The journey opens and something introduces itself.",
    can:[["One element can take the slow duration","Nothing is competing yet, so duration-slow reads as composure rather than lag."],
         ["Groups can arrive in sequence","Chips and cards arriving in order tell people what their choices are."]],
    cannot:[["Do not peak here","The strongest gesture belongs at Confirm. Two peaks flatten into a plateau."]],
    opts:{ list:["cascade","group-fade"], single:["single-rise","quiet-fade"],
           surface:["sheet-rise","surface-fade"], text:["quiet-fade","single-rise"], icon:["icon-settle","icon-fade"],
           loading:["ambient-loop"], leaving:["dim"], tap:["tap-response"] } },

  Find: { label:"A Find moment", plain:"Someone is searching, filtering, or entering what is needed.",
    quiet:"Someone is working. Motion here interrupts them.",
    can:[["Standard component motion already covers most of this","Keyboard rise, drawer rise, field focus. You mostly need to not add anything."],
         ["Confirmations can settle","An attachment docking is the one expressive beat this stage earns, because it answers a real moment of doubt."]],
    cannot:[["Nothing at duration-slow","500ms mid-task reads as the app lagging, not as composure."]],
    opts:{ list:["group-fade","cascade"], single:["settle","quiet-fade"],
           surface:["sheet-rise","surface-fade"], text:["quiet-fade"], icon:["icon-fade","stroke-in"],
           loading:["ambient-loop"], leaving:["dim"], tap:["tap-response"] } },

  Act: { label:"An Act moment", plain:"Someone is choosing, reviewing, or committing to something.",
    can:[["Rows can arrive in reading order","It stops people scanning a layout that is still assembling."],
         ["Selection can respond immediately","duration-instant on anything finger-caused."]],
    cannot:[["This is not the peak yet","Nothing is settled here. Save the strongest gesture for Confirm."]],
    opts:{ list:["cascade","group-fade"], single:["quiet-fade","single-rise"],
           surface:["sheet-rise","surface-fade"], text:["progressive-reveal","quiet-fade"], icon:["stroke-in","icon-fade"],
           loading:["ambient-loop"], leaving:["dim","recede"], tap:["tap-response"] } },

  Confirm: { label:"A Confirmation", plain:"The moment someone finds out where they stand.",
    can:[["One gesture can carry this","The only place a single element should lead. Everything else supports it."],
         ["ease-settle belongs here","Once per journey. Using it earlier is what stops it meaning anything."]],
    cannot:[["Only one significant motion","Two elements competing for the moment reads as noise, not emphasis."]],
    opts:{ list:["cascade","group-fade"], single:["settle","single-rise","quiet-fade"],
           surface:["sheet-rise","surface-fade"], text:["single-rise","quiet-fade"], icon:["stroke-in","icon-settle","icon-fade"],
           loading:["ambient-loop"], leaving:["dim"], tap:["tap-response"] } },

  Complete: { label:"A Completion", plain:"The journey closes and someone is told what happens next.",
    quiet:"The moment has landed. Anything loud here competes with what just happened.",
    can:[["Follow-up can arrive late","Arriving after the outcome gives the verdict a beat of silence first."],
         ["Groups can arrive together","Quieter than a sequence, which is right once the outcome is already read."]],
    cannot:[["Do not repeat the peak","Confirm already carried it. A second strong gesture halves the first."]],
    opts:{ list:["group-fade","cascade"], single:["quiet-fade"],
           surface:["surface-fade","sheet-rise"], text:["quiet-fade","single-rise"], icon:["icon-fade","stroke-in"],
           loading:["ambient-loop"], leaving:["dim","recede"], tap:["tap-response"] } }
};
var ORDER = ["Welcome","Find","Act","Confirm","Complete"];
