(function() {
        try {
            var t = localStorage.getItem('theme');
            if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
            var c = localStorage.getItem('customPrimaryColor');
            if (c) {
                var h2hsl = function(hex) {
                    var r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
                    var max=Math.max(r,g,b),min=Math.min(r,g,b),h=0,s=0,l=(max+min)/2;
                    if(max!==min){var d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);
                        if(max===r)h=(g-b)/d+(g<b?6:0);else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h/=6;}
                    return{h:h*360,s:s,l:l};
                };
                var hsl2hex = function(h,s,l) {
                    var hue2rgb=function(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<0.5)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
                    var r,g,b;
                    if(s===0){r=g=b=l;}else{var q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;r=hue2rgb(p,q,h/360+1/3);g=hue2rgb(p,q,h/360);b=hue2rgb(p,q,h/360-1/3);}
                    return'#'+[r,g,b].map(function(x){return Math.round(x*255).toString(16).padStart(2,'0');}).join('');
                };
                var pal=h2hsl(c), el=document.documentElement;
                el.style.setProperty('--primary',       c);
                el.style.setProperty('--primary-light', hsl2hex(pal.h, Math.min(pal.s*1.2,1), Math.min(pal.l+0.15,0.85)));
                el.style.setProperty('--primary-dark',  hsl2hex(pal.h, pal.s, Math.max(pal.l-0.08,0.1)));
                el.style.setProperty('--accent',        hsl2hex((pal.h+45)%360, 0.85, 0.55));
            }
        } catch(_) {}
    })();
    