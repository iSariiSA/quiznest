const { emptyLibrary, importPacks } = require('./core.cjs');
function sampleLibrary() {
  const data=emptyLibrary();
  importPacks(data,[
    {course:'Biology',unit:'Unit 1: Cells',title:'The building blocks of life',questions:[
      {prompt:'Which organelle is the primary site of ATP production in a eukaryotic cell?',options:['The nucleus','The mitochondrion','The Golgi apparatus','The lysosome'],correctAnswer:1,explanation:'Mitochondria produce most cellular ATP through aerobic respiration and oxidative phosphorylation.'},
      {prompt:'What is the main function of the cell membrane?',options:['To control movement of substances into and out of the cell','To produce proteins','To store genetic material','To break down glucose'],correctAnswer:0,explanation:'The selectively permeable membrane regulates what enters and leaves the cell.'},
      {prompt:'Which structure is found in plant cells but not animal cells?',options:['Ribosome','Mitochondrion','Cell wall','Cell membrane'],correctAnswer:2,explanation:'Plant cells have a cellulose cell wall outside their cell membrane.'},
      {prompt:'Where does protein synthesis occur?',options:['Lysosomes','Ribosomes','Vacuoles','Centrioles'],correctAnswer:1,explanation:'Ribosomes translate messenger RNA into proteins.'},
      {prompt:'Which organelle contains most of a eukaryotic cell’s DNA?',options:['The Golgi apparatus','The mitochondrion','The ribosome','The nucleus'],correctAnswer:3,explanation:'Most DNA is stored in the nucleus. Mitochondria also contain a small amount of DNA.'}
    ]},
    {course:'Biology',unit:'Unit 1: Cells',title:'Inside the cell',questions:[
      {prompt:'What is the fluid inside a cell called?',options:['Cytosol','Plasma','Lymph','Bile'],correctAnswer:0,explanation:'Cytosol is the fluid component of the cytoplasm.'},
      {prompt:'Which organelle modifies, sorts, and packages proteins?',options:['Nucleus','Golgi apparatus','Mitochondrion','Chloroplast'],correctAnswer:1,explanation:'The Golgi apparatus processes and packages proteins for transport.'},
      {prompt:'What distinguishes prokaryotic cells from eukaryotic cells?',options:['They have no DNA','They have no cell membrane','They lack a membrane-bound nucleus','They cannot make proteins'],correctAnswer:2,explanation:'Prokaryotic DNA is found in a nucleoid region rather than a membrane-bound nucleus.'}
    ]},
    {course:'Biology',unit:'Unit 2: Genetics',title:'A question of inheritance',questions:[
      {prompt:'Which molecule carries hereditary information?',options:['ATP','DNA','Glucose','Cellulose'],correctAnswer:1,explanation:'DNA stores genetic information in its sequence of bases.'},
      {prompt:'In DNA, adenine pairs with which base?',options:['Cytosine','Guanine','Thymine','Uracil'],correctAnswer:2,explanation:'DNA base pairing follows A–T and C–G. Uracil replaces thymine in RNA.'},
      {prompt:'What is a gene?',options:['A type of cell','A segment of DNA that contributes to a functional product','A protein that digests food','An entire organism'],correctAnswer:1,explanation:'Genes are DNA sequences that contribute to functional RNA or protein products.'}
    ]},
    {course:'Chemistry',unit:'Unit 1: Matter',title:'Atoms & everything',questions:[
      {prompt:'Which particle has a negative electric charge?',options:['Proton','Neutron','Electron','Nucleus'],correctAnswer:2,explanation:'Electrons are negatively charged. Protons are positive and neutrons are neutral.'},
      {prompt:'The atomic number of an element equals its number of…',options:['Neutrons','Protons','Electron shells','Isotopes'],correctAnswer:1,explanation:'The number of protons defines the element.'},
      {prompt:'Which of these is a chemical change?',options:['Melting ice','Cutting paper','Boiling water','Rusting iron'],correctAnswer:3,explanation:'Rusting forms new chemical substances: iron oxides.'}
    ]},
    {course:'Mathematics',unit:'Unit 1: Foundations',title:'Find your angle',questions:[
      {prompt:'The interior angles of a triangle add up to…',options:['90°','180°','270°','360°'],correctAnswer:1,explanation:'In Euclidean geometry, a triangle’s interior angles sum to 180°.'},
      {prompt:'What is the square root of 144?',options:['10','11','12','14'],correctAnswer:2,explanation:'12 × 12 = 144.'},
      {prompt:'If 3x + 6 = 21, what is x?',options:['3','5','7','9'],correctAnswer:1,explanation:'Subtract 6 from both sides, then divide by 3: x = 15 / 3 = 5.'}
    ]}
  ]);
  data.courses[0].description='Life, from the inside out.';
  data.courses[1].description='Small particles. Big possibilities.';
  data.courses[2].description='Make sense of the patterns.';
  return data;
}
module.exports={sampleLibrary};
