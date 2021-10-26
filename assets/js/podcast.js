var max_allowed_opened = 1;
var opened = [];
var liked;
var disliked;


    $(document).ready(function(){
        console.log(window.liked);
        if(window.liked != 'None'){
            liked = JSON.parse(window.liked);
        }
        else{
            liked = [];
        }
        if(window.disliked != 'None'){
            disliked = JSON.parse(window.disliked);
        }
        else{
            disliked = [];
        }


        // First, checks if it isn't implemented yet.
        if (!String.prototype.format) {
            String.prototype.format = function() {
                var args = arguments;
                return this.replace(/{(\d+)}/g, function(match, number) {
                    return typeof args[number] != 'undefined'
                        ? args[number]
                        : match
                        ;
                });
            };
        }

        if(window.nickname == 'None'){
            askForNickname();
        }

        //Prevent Scroll


        //Open Podcast
        $(document).on('click', '.podcast-click', function(){
            var parent = $(this).parent();
            if (!parent.hasClass('extended')){
                $('#container').css('scroll-snap-type', 'none');
                turnOn(parent);
                $(this).hide();
                setTimeout(function (){
                    $('#container').css('scroll-snap-type', 'y mandatory');
                }, 1000);
            }
        });

        //Close Podcast
        $(document).on('click', '.close', function(){
            var parent = $(this).parent();
            if(parent.hasClass('extended')){
                turnOff(parent);
                removeFromOpened(parent);
            }
        });

        //Submit Comment
        $(document).on('click', '.comment-submit', function(){
            var podcast = $(this).parent().parent();
            var podcastId = podcast.attr('id').split('-')[1];
            var comment_input = podcast.find('.comment-input');
            var comment_text = comment_input.val();
            var user_id = 0;
            if(comment_text.length > 2){
                var pageUrl = '/action/comment/' + podcastId + '/';
                $.ajax({
                    type: 'POST',
                    url: pageUrl,
                    data: { comment: comment_text, user_id: user_id, csrfmiddlewaretoken: window.CSRF_TOKEN },
                    dataType: 'json',
                    success: function (data) {
                        var commentId = data.commentId;
                        var code = data.response;

                        //Code 500 - No Comment Received
                        //Code 502 - No Nickname Set
                        //Code 503 - Podcast not Found
                        if(code == 500){}
                        else if(code == 502){
                            askForNickname();
                        }
                        else if(code == 503){}

                        podcast.find('.comment-input').val('');
                        getMasterComments(podcastId, 50, 0);
                        comment_input.focus();
                    },
                    error: function (error){
                        console.log(error);
                    }
                });
            }
        });
        $('.comment-input').on('keypress', function (e) {
            if(e.which === 13 && !e.shiftKey){
                //Disable textbox to prevent multiple submit
                $(this).attr("disabled", "disabled");
                var podcast = $(this).parent().parent();
                var podcastId = podcast.attr('id').split('-')[1];
                var comment_input = podcast.find('.comment-input');
                var comment_text = comment_input.val();
                var user_id = 0;
                if(comment_text.length > 2){
                    var pageUrl = '/action/comment/' + podcastId + '/';
                    $.ajax({
                        type: 'POST',
                        url: pageUrl,
                        data: { comment: comment_text, user_id: user_id, csrfmiddlewaretoken: window.CSRF_TOKEN },
                        dataType: 'json',
                        success: function (data) {
                            var commentId = data.commentId;
                            var code = data.response;
                            podcast.find('.comment-input').val('');
                            getMasterComments(podcastId, 50, 0);
                            comment_input.focus();
                        },
                        error: function (error){
                            console.log(error);
                        }
                    });
                }
                //Enable the textbox again if needed.
                $(this).removeAttr("disabled");
            }
        });

        //Like Comment
        $(document).on('click', '.com-like', function(){
            var comment = $(this).parent().parent();
            var commentId = comment.attr('id');
            var pageUrl = '/action/like/' + commentId + '/';
            if(!hasLiked(commentId)){
                wasDisliked = false;
                if(hasDisliked(commentId)){
                    removeDislikeComment(commentId);
                    wasDisliked = true;
                }
                $.ajax({
                    type: 'GET',
                    url: pageUrl,
                    dataType: 'json',
                    success: function (data) {
                        liked.push(commentId);
                        updateComment(commentId);
                        var points = comment.find('.com-points').text();
                        if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
                        }else{
                            points = parseInt(points);
                            points += 1;
                            if(wasDisliked){
                                points += 1;
                            }
                            comment.find('.com-points').text(nFormatter(points, 1));
                        }
                    },
                    error: function (error){
                        console.log(error);
                    }
                });
            }
            else{
                removeLikeComment(commentId);
                updateComment(commentId);
                var points = comment.find('.com-points').text();
                if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
                }else{
                    points = parseInt(points);
                    points -= 1;
                    comment.find('.com-points').text(nFormatter(points, 1));
                }
            }
        });

        //Disike Comment
        $(document).on('click', '.com-dislike', function(){
            var comment = $(this).parent().parent();
            var commentId = comment.attr('id');
            var pageUrl = '/action/dislike/' + commentId + '/';
            if(!hasDisliked(commentId)){
                wasLiked = false;
                if(hasLiked(commentId)) {
                    removeLikeComment(commentId);
                    wasLiked = true;
                }
                $.ajax({
                    type: 'GET',
                    url: pageUrl,
                    dataType: 'json',
                    success: function (data) {
                        disliked.push(commentId);
                        updateComment(commentId);
                        var points = comment.find('.com-points').text();
                        if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
                        }else{
                            points = parseInt(points);
                            points -= 1;
                            if(wasLiked){
                                points -= 1;
                            }
                            comment.find('.com-points').text(nFormatter(points, 1));
                        }
                    },
                    error: function (error){
                        console.log(error);
                    }
                });
            }
            else{
                removeDislikeComment(commentId);
                updateComment(commentId);
                var points = comment.find('.com-points').text();
                if(points.indexOf('k') > -1 || points.indexOf('m') > -1) {
                }else{
                    points = parseInt(points);
                    points += 1;
                    comment.find('.com-points').text(nFormatter(points, 1));
                }
            }
        });

    });

    // PODCAST - ON / OFF
    function turnOn(podcast){
        var removal = 0;
        if(opened.length >= max_allowed_opened){
            removal = clearOpened(podcast);
        }
        scrollTo(podcast, removal);
        podcast.addClass('extended');
        podcast.children('.duration-preview').css('opacity', 0);
        podcast.children('.data-bar').css('opacity', 1);
        podcast.children('.close').css('opacity', 1);
        opened.push(podcast);
        var comment_input = podcast.find('.comment-input');
        //comment_input.focus();
        podcast.find('.comment-max-char').text('0');
        var podcastId = podcast.attr('id').split('-')[1];
        getMasterComments(podcastId, 50, 0);
        podcast.find('.comment-input').on("change keyup paste", function() {
            var totalLength = $(this).val().length;
            podcast.find('.comment-max-char').text(totalLength);
            var currentVal = $(this).val().split('\n').length - navigator.userAgent.indexOf("MSIE");
            if(totalLength > 2){
                podcast.find('.submit').addClass('interactable');
            }
            else{
                    podcast.find('.submit').removeClass('interactable');
            }

            if(currentVal > 2 || totalLength > 35){
                if(!podcast.find('.comment').hasClass('enlarge')){
                    podcast.find('.comment').addClass('enlarge');
                    podcast.find('.comments').addClass('enlarge-edit');
                    podcast.find('.comments-wrap').addClass('enlarge-edit-wrap');
                }
            }
            else{
                if( podcast.find('.comment').hasClass('enlarge')){
                    podcast.find('.comment').removeClass('enlarge');
                    podcast.find('.comments').removeClass('enlarge-edit');
                    podcast.find('.comments-wrap').removeClass('enlarge-edit-wrap');
                }
            }
        });
    }
    function turnOff(podcast){
        podcast.removeClass('extended');
        podcast.children('.duration-preview').css('opacity', 1);
        podcast.children('.close').css('opacity', 0);
        podcast.children('.data-bar').css('opacity', 0);
        podcast.find('.podcast-click').show();
        //$.scrollify.update();
    }
    function removeFromOpened(podcast){
        if(opened.length > 0){
            var newopen = [];
            for(i=0;i<opened.length;i++){
                if(opened[i].id != podcast.id){
                    newopen.push(opened[i]);
                }
            }
            opened = newopen;
        }
    }
    function clearOpened(podcast){
        var removal = 0;
        var offset = podcast.offset().top;
        if(opened.length > 0){
            for(i=0;i<opened.length;i++){
                if(opened[i].offset().top < offset){
                    removal += 1;
                }
                turnOff(opened[i]);
            }
            opened = [];
            var onevh = $(window).height() / 100;
            return removal * (onevh * 72);
        }
        return 0;
    }
    function scrollTo(selector, removal) {
        var offset = selector.offset();
        var $main = $('#container');
        console.log('Scrolling To: ' + offset.top + ' Removal: ' + removal);
        $main.animate({
            scrollTop: offset.top - ($main.offset().top - $main.scrollTop()) - removal
        }, "fast");
    }


    // NICKNAME
    var can_submit_nick = false;
    function askForNickname(){
        $('.nickname').show();
        $('.nickname-container input[type=text]').focus();
        $('.nickname-container input[type=text]').on('change keyup paste', function (){
            var nick = $('.nickname input[type=text]').val();
            if(nick.length > 2){
                can_submit_nick = true;
                $('.nickname-container input[type=submit]').css('color', 'lightgrey');
            }
            else{
                can_submit_nick = false;
                $('.nickname-container input[type=submit]').css('color', 'grey');
            }
        });
        $('.nickname-container input[type=submit]').on('click', function (){
            var nick = $('.nickname-container input[type=text]').val();
            console.log(nick);
            if(can_submit_nick){
                var pageUrl = '/action/nickname/set/' + nick + '/';
                $.ajax({
                    type: 'GET',
                    url: pageUrl,
                    dataType: 'json',
                    success: function (data) {
                        if(data.responseStatus == 'success'){
                            $('.nickname').hide();
                            $('.nickname p').hide();
                            window.nickname = nickname;
                        }
                        else{
                            $('.nickname p').show();
                            $('.nickname p').text(data.responseError);
                            $('.nickname-container input[type=text]').focus();
                        }
                    },
                    error: function (error){
                        console.log(error);
                    }
                });
            }
        });
    }


    // COMMENT UPDATING
    function getMasterComments(podcastId, amount, offset){
        var pageUrl = '/data/' + podcastId + '/comments/' + amount + '/' + offset + '/';
        var comments = []
        $.ajax({
            type: 'GET',
            url: pageUrl,
            dataType: 'json',
            success: function (data) {

                updateCommentDisplay(podcastId,data.comments, data.comments_total);
            },
            error: function (error){
                console.log(error);
            }
        });
    }
    function updateCommentDisplay(podcastId, comments, total_comments){
        var podcast = $('#podcast-' + podcastId);
        var databar = podcast.find('.data-bar');
        var commentSection = podcast.find('.comments');

        commentSection.text('');
        $.each(comments, function(index, comment){
            var comment_template = '<div class="com" id="{0}">' +
                '<a class="com-text">' +
                    '<i class="com-name-wrap"><i class="fa fa-heart com-donor {1}"></i>' +
                    '<span class="com-name" style="color:rgb{2};">{3}</span></i>' +
                '{4}</a>' +
                '<div class="com-bar">' +
                    '<a class="com-dislike"><i class="fa fa-arrow-down"></i></a>' +
                    '<a class="com-points">{5}</a>' +
                    '<a class="com-like"><i class="fa fa-arrow-up"></i></a>' +
                    '<a class="com-comment"><i class="far fa-comment"></i>{6}</a>' +
                '</div></div>';
            comment_template = comment_template.format(comment.id, comment.donor, comment.nameColor, comment.name, comment.comment, nFormatter(comment.likes - comment.dislikes, 1), 0)
            commentSection.append(comment_template);
            updateComment(comment.id);
        });
        databar.find('a span.comment-total').text(nFormatter(total_comments, 1));
    }


    // COMMENT - Like / Dislike
    function hasLiked(id) {
        var hasliked = false;
        $.each(liked, function (index, commentId){
            if(commentId == id){
                hasliked = true;
            }
        });
        return hasliked;
    }
    function hasDisliked(id) {
        var hasdisliked = false;
        $.each(disliked, function (index, commentId){
            if(commentId == id){
                hasdisliked = true;
            }
        });
        return hasdisliked;
    }
    function removeLikeComment(id){
        var new_liked = [];
        $.each(liked, function (comment_id){
            if(comment_id != id){
                new_liked.push(comment_id);
            }
        });
        liked = new_liked;
    }
    function removeDislikeComment(id){
        var new_disliked = [];
        $.each(disliked, function (comment_id){
            if(comment_id != id){
                new_disliked.push(comment_id);
            }
        });
        disliked = new_disliked;
    }
    function updateComment(id){
        var likeBtn = $('#' + id).find('.com-like');
        var dislikeBtn = $('#' + id).find('.com-dislike');
        if(hasLiked(id)){
            likeBtn.addClass('liked');
            dislikeBtn.removeClass('disliked');
        }
        else if(hasDisliked(id)){
            likeBtn.removeClass('liked');
            dislikeBtn.addClass('disliked');
        }
        else{
            likeBtn.removeClass('liked');
            dislikeBtn.removeClass('disliked');
        }
    }


    // ADDITIONAL
    function nFormatter(num, digits) {
        var si = [
            { value: 1, symbol: "" },
            { value: 1E3, symbol: "k" },
            { value: 1E6, symbol: "m" },
            { value: 1E9, symbol: "g" },
            { value: 1E12, symbol: "t" },
            { value: 1E15, symbol: "p" },
            { value: 1E18, symbol: "e" }
        ];
        var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
        var i;
        for (i = si.length - 1; i > 0; i--) {
            if (num >= si[i].value) {
                break;
            }
        }
        return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
    }

    //
