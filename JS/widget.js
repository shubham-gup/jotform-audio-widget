JFCustomWidget.subscribe("ready", function(){
  var label = JFCustomWidget.getWidgetSetting('QuestionLabel');
  document.getElementById('labelText').innerHTML = label;
  //subscribe to form submit event
  JFCustomWidget.subscribe("submit", function(){
      var msg = {
          //you should valid attribute to data for JotForm
          //to be able to use youw widget as required
          valid: true,
          value: document.getElementById('userInput').value
      }
      // send value to JotForm
      JFCustomWidget.sendSubmit(msg);
  });
});
