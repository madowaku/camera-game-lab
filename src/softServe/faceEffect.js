const oval=(c,x,y,rx,ry)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
function cone(c,x,y,size) {
  c.fillStyle="#cf9854";c.beginPath();c.moveTo(x-size*.55,y);c.lineTo(x,y+size);c.lineTo(x+size*.55,y);c.fill();
  c.fillStyle="#fff7eb";for(let i=0;i<3;i++)oval(c,x,y-i*size*.28,size*(.68-i*.12),size*.23);
}
export function softServeFaceEffect(c,{x,y,width:w,height:h,eyeY,mouth,open,crown}) {
  c.strokeStyle="#f57682";c.lineWidth=w*.075;c.beginPath();c.moveTo(x-w*.55,eyeY);c.lineTo(x+w*.55,eyeY);c.stroke();
  c.fillStyle="#694435";oval(c,x-w*.25,eyeY,w*.24,h*.18);oval(c,x+w*.25,eyeY,w*.24,h*.18);
  cone(c,x-w*.25,eyeY+h*.01,w*.27);cone(c,x+w*.25,eyeY+h*.01,w*.27);
  for(let i=0;i<12;i++){c.save();c.translate(x+(i%2?1:-1)*w*(.23+(i%3)*.08),y+h*(.08+(i%4)*.025));c.rotate(i);c.fillStyle=["#ff7190","#a9be88","#ffcf6b"][i%3];c.fillRect(-2,-1,5,2);c.restore();}
  if(open){c.font="900 "+w*.28+"px sans-serif";c.textAlign="center";c.shadowColor="#f57682";c.shadowBlur=12;c.fillStyle="#fff7eb";c.fillText("EAT!",mouth.x,mouth.y+h*.28);c.shadowBlur=0;}
  if(crown)for(let i=0;i<3;i++)cone(c,x+(i-1)*w*.3,y-h*.75,w*.23);
}
