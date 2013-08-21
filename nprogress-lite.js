/*
 * (C) 2013 - Jaime Yap
 * A fork of http://ricostacruz.com/nprogress to remove the jQuery dependency.
 *
 * NOTE: This only works on browsers that support document.querySelector
 * (which is pretty much everyone except IE 7-).
 */

;(function(factory) {

  function vendorPrefix(style) {
    if (style == "transition" || style == "transform") { // Just covering what's used in this file
      return ["-moz-" + style, "-o-" + style, "-webkit-" + style, "-ms-" + style, style];
    } else {
      return [style];
    }
  }

  // Teeny-tiny element wrapper that mimics jQuery.
  function Q(el) { this.el = el; }
  Q.prototype = {
    find: function(selector) {
      return new Q(this.el.querySelector(selector));
    },
    css: function(styles) {
      var me = this;
      Object.keys(styles).map(function(style) {
        var vendorStyles = vendorPrefix(style);
        for (var i = 0; i < vendorStyles.length; i++) {
          me.el.style[vendorStyles[i]] = styles[style];
        }
      });
      return this;
    },
    addClass: function(className) {
      this.el.classList.add(className);
      return this;
    },
    removeClass : function(className) {
      this.el.classList.remove(className);
      return this;
    },
    appendTo : function(parent) {
      if (parent instanceof Q) {
        parent.el.appendChild(this.el);
      } else {
        parent.appendChild(this.el);
      }
      return this;
    },
    remove : function() {
      if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
    },
  }

  function notJQuery(selector) { return new Q(document.querySelector(selector)); }

  this.NProgress = factory(notJQuery, Q);

})(function($, Q) {
  var NProgress = {};

  NProgress.version = '0.1.0';

  var Settings = NProgress.settings = {
    minimum: 0.08,
    easing: 'ease',
    speed: 200,
    trickle: true,
    trickleRate: 0.02,
    trickleSpeed: 800,
    template: '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner"><div class="spinner-icon"></div></div>'
  };

  /**
   * Updates configuration.
   *
   *     NProgress.configure({
   *       minimum: 0.1
   *     });
   */
  NProgress.configure = function(options) {
    Object.keys(options).map(function(key) {
      Settings[key] = options[key];
    });
    return this;
  };

  /**
   * Last number.
   */

  NProgress.status = null;

  /**
   * Sets the progress bar status, where `n` is a number from `0.0` to `1.0`.
   *
   *     NProgress.set(0.4);
   *     NProgress.set(1.0);
   */

  NProgress.set = function(n) {
    var started = NProgress.isStarted();

    n = clamp(n, Settings.minimum, 1);
    NProgress.status = (n === 1 ? null : n);

    var $progress = NProgress.render(!started),
        $bar      = $progress.find('[role="bar"]'),
        speed     = Settings.speed,
        ease      = Settings.easing;

    $progress.el.offsetWidth; /* Repaint */

    $bar.css({
      transition: 'all '+speed+'ms '+ease,
      transform: 'translate3d('+toBarPerc(n)+'%,0,0)'
    });

    if (n === 1) {
      // Fade out
      $progress.css({ transition: 'none', opacity: 1 });
      $progress.el.offsetWidth; /* Repaint */

      setTimeout(function() {
        $progress.css({ transition: 'all '+speed+'ms linear', opacity: 0 });
        setTimeout(function() {
          NProgress.remove();
        }, speed);
      }, speed);
    }

    return this;
  };

  NProgress.isStarted = function() {
    return typeof NProgress.status === 'number';
  };

  /**
   * Shows the progress bar.
   * This is the same as setting the status to 0%, except that it doesn't go backwards.
   *
   *     NProgress.start();
   *
   */
  NProgress.start = function() {
    if (!NProgress.status) NProgress.set(0);

    var work = function() {
      setTimeout(function() {
        if (!NProgress.status) return;
        NProgress.trickle();
        work();
      }, Settings.trickleSpeed);
    };

    if (Settings.trickle) work();

    return this;
  };

  /**
   * Hides the progress bar.
   * This is the *sort of* the same as setting the status to 100%, with the
   * difference being `done()` makes some placebo effect of some realistic motion.
   *
   *     NProgress.done();
   *
   * If `true` is passed, it will show the progress bar even if its hidden.
   *
   *     NProgress.done(true);
   */

  NProgress.done = function(force) {
    if (!force && !NProgress.status) return this;

    return NProgress.inc(0.3 + 0.5 * Math.random()).set(1);
  };

  /**
   * Increments by a random amount.
   */

  NProgress.inc = function(amount) {
    var n = NProgress.status;

    if (!n) {
      return NProgress.start();
    } else {
      if (typeof amount !== 'number') {
        amount = (1 - n) * clamp(Math.random() * n, 0.1, 0.95);
      }

      n = clamp(n + amount, 0, 0.994);
      return NProgress.set(n);
    }
  };

  NProgress.trickle = function() {
    return NProgress.inc(Math.random() * Settings.trickleRate);
  };

  /**
   * (Internal) renders the progress bar markup based on the `template`
   * setting.
   */

  NProgress.render = function(fromStart) {
    if (NProgress.isRendered()) return $("#nprogress");
    $('html').addClass('nprogress-busy');

    var $el = new Q(document.createElement("div"));
    $el.el.id = "nprogress";
    $el.el.innerHTML = Settings.template;

    var perc = fromStart ? '-100' : toBarPerc(NProgress.status || 0);

    $el.find('[role="bar"]').css({
      transition: 'all 0 linear',
      transform: 'translate3d('+perc+'%,0,0)'
    });

    $el.appendTo(document.body);

    return $el;
  };

  /**
   * (Internal) Removes the element. Opposite of render().
   */

  NProgress.remove = function() {
    $('html').removeClass('nprogress-busy');
    $('#nprogress').remove();
  };

  /**
   * Checks if the progress bar is rendered.
   */

  NProgress.isRendered = function() {
    return ($("#nprogress").el);
  };

  /**
   * Helpers
   */

  function clamp(n, min, max) {
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  /**
   * (Internal) converts a percentage (`0..1`) to a bar translateX
   * percentage (`-100%..0%`).
   */

  function toBarPerc(n) {
    return (-1 + n) * 100;
  }

  return NProgress;
});

