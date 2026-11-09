// Navigate through the same creation and settings entry points used in the app.
async function command(page,name){
  if(name==='Settings'){await page.getByRole('button',{name:'Settings',exact:true}).click();return page.getByRole('button',{name:'Data & recovery settings',exact:true}).click();}
  if(name==='New course…'){
    await page.getByRole('button',{name:'Add to library',exact:true}).click();
    return page.getByRole('menuitem',{name,exact:true}).click();
  }
  if(name==='New unit…'){
    await page.getByRole('button',{name:'Course actions',exact:true}).click();
    return page.getByRole('menuitem',{name,exact:true}).click();
  }
  if(name==='Discard attempt…'){
    await page.getByRole('button',{name:'Quiz actions',exact:true}).click();
    return page.getByRole('menuitem',{name,exact:true}).click();
  }
  if(name==='Help'){
    await page.getByRole('button',{name:'Settings',exact:true}).click();
    await page.getByRole('button',{name:'Help settings',exact:true}).click();
    return page.getByRole('button',{name:'Open help',exact:true}).click();
  }
  if(!['New quiz…','Prepare a quiz…','Import…'].includes(name))throw new Error(`Unknown UI command: ${name}`);
  const entry=page.locator('.top-actions [data-action="newQuiz"], .breadcrumbs [data-action="newQuiz"], .top-actions [data-action="libraryCreateMenu"]');
  await entry.waitFor({state:'visible'});
  const create=(await entry.getAttribute('data-action'))==='libraryCreateMenu';await entry.click();
  if(create)await page.getByRole('menuitem',{name:'New quiz…',exact:true}).click();
  if(name==='Prepare a quiz…')await page.getByRole('button',{name:'Prepare with an agent',exact:true}).click();
  if(name==='Import…')await page.getByRole('button',{name:'Import file',exact:true}).click();
}
module.exports={command};
