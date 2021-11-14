$(document).ready(function(){
    var doctop = $('#pods').offset().top;
    var vh = $(window).height() / 100;
    var scroll = $('#pods').height();
    $('#pods').scroll(function(){
        var pods = $('#pods .pod');
        $.each(pods, function(x, pod){
            if(pod != undefined){
                var top = $(pod).offset().top;
                var bottom = top + $(pod).height() - (scroll + doctop + vh);
                var opacity = 1;
                top -= doctop + vh;
                if(top <= 0){
                    opacity = (top/30)+1
                }
                else if(bottom > 0){
                    opacity = ((bottom/30)* -1) + 1;
                }
                $(pod).css('opacity', opacity);
            }
        });
    });
});