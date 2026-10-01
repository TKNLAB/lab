/* ============================================================================
   NAYAK LAB — WEBSITE CONTENT
   ----------------------------------------------------------------------------
   This one file holds ALL the content that changes over time. Every page of
   the site reads from it. Edit it with Dashboard.dc.html (Chrome or Edge:
   "Open site folder" → edit → "Save to folder"), or by hand — keep the commas
   and quotes intact. Last saved from the dashboard: 2026-10-01.
   ============================================================================ */
window.LAB_CONTENT = {

  /* PRINCIPAL INVESTIGATOR — title and department, used in the nav, footer, Home, People, Teaching and Join pages. */
  "pi": {"title":"Associate Professor","dept":"KSBS"},

  /* PEOPLE — in display order. status "current" → Lab Group, "alumni" → Lab alumni. img "" shows initials. */
  "people": [
    {"status":"current","img":"assets/people/pooja.webp","name":"Pooja Verma","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Modeling the behaviour of neurons in the nicotinic addiction-and-withdrawal network, using the NEURON simulation environment to capture pathways with complex branched anatomy and biophysical membrane properties.","past":"Past:\nB.Tech Electronics & Communication Engg, Maharaja Surajmal Institute of Technology, Delhi (2016–20)"},
    {"status":"current","img":"assets/people/sunil.webp","name":"Sunil Gadhwal","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Understanding the structure–function relationship of the human two-pore channel 2 (hsTPC2), an endolysosomal ion channel. Enjoys experimental research; sports are a stressbuster in free time.","past":"Past:\nMSc Biotechnology (2019–21)\nBSBE, IIT Bombay"},
    {"status":"current","img":"assets/people/mahesh.webp","name":"Mahesh Mahadeo Mathe","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Screening ion channels involved in neuropathic pain — in silico / in vitro HTS, transcriptomics, electrophysiology and MD simulations.","past":"Past:\nM.Tech Medical Biotechnology, IIT Hyderabad (2018–20)"},
    {"status":"current","img":"assets/people/rajiv.webp","name":"Rajiv Sharma","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Understanding the mechanism of nicotine binding to nAChRs and its role in synapse development, combining electrophysiology and computational studies.","past":"Past:\nMSc Biotechnology, University of Hyderabad (2021–23)\nBSc Botany (Hons.), University of Delhi (2018–2021)"},
    {"status":"current","img":"assets/people/ritu.webp","name":"Ritu Singh","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Investigating the biophysical properties and functional role of ion channels in endolysosomes — ion permeability, channel regulation and intracellular trafficking.","past":"Past:\nMSc Biochemistry, Institute of Sciences, Banaras Hindu University (2021–2023)\nBSc (Hons.) Biochemistry, University of Delhi (2018–2021)"},
    {"status":"current","img":"assets/people/gauri-saini.webp","name":"Gauri Saini","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Neuropathic Pain Dissecting nicotinic, glutamatergic and TRP channel contributions to chronic pain.","past":""},
    {"status":"current","img":"assets/people/rakesh-barwar.webp","name":"Rakesh Barwar","role":"Ph.D. Scholar","email":"","linkedin":"https://www.linkedin.com/in/rakesh-barwar-47182a91/","bio":"Works on TPC2, an ion channel of the endolysosome, and the molecular mechanisms that control its opening and closing. Builds the structural models, makes the mutants and records what they do.","past":"Past:\nMSc Biotech, Maharshi Dayanand University - Rohtak, Haryana"},
    {"status":"current","img":"assets/people/jaweria-mariam.webp","name":"Jaweria Mariam","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Ligand-Binding Energetics Measuring how much of an agonist's binding energy is spent opening the channel.","past":""},
    {"status":"current","img":"assets/people/tanish-gupta.webp","name":"Tanish Gupta","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Synaptic Maturation How synaptic receptors change as synapses mature during development.","past":""},
    {"status":"current","img":"assets/people/shyamolima.webp","name":"Shayamolima Gogoi","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Working on the role of ion channels in autophagy and neurodegeneration. Beyond research, enjoys books, TV shows and staying active through sports — a believer in being a ‘jack of all trades’ (and occasionally mastering a few).","past":"Past:\nIntegrated MSc in Systems Biology, University of Hyderabad (2020–2025)"},
    {"status":"alumni","img":"assets/people/sushanth.webp","name":"Sushanth Adusumilli","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Investigating the intracellular TRPML3 ion channel; experienced in patch-clamp and RNA-seq data analysis. Finds satisfaction in understanding new concepts and teaching others — console and PC gaming are a favourite way to unwind.","past":"Past:\nMS Biochemistry & Molecular Biology, University of Southern California (2016–18)"},
    {"status":"alumni","img":"assets/people/pradeepti.webp","name":"Pradeepti Kampani","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Studying allostery in a model GPCR — the muscarinic acetylcholine receptor with the GIRK channel as a reporter — using patch-clamp electrophysiology to capture the receptor’s millisecond conformational changes. An avid reader who enjoys time with family and friends.","past":"Past:\nMSc Biomedical Science, ACBR, University of Delhi (2014–16)"},
    {"status":"alumni","img":"assets/people/awanish.webp","name":"Awanish Kumar","role":"Post-doctoral Fellow","email":"","linkedin":"","bio":"Studied the role of choline in neuromuscular synapse formation using chick-embryo neuronal preparations, and how receptor engineering shapes synaptic responses during development.","past":"Past:\nPostdoctoral Scholar, University of Kentucky–Lexington, USA (2021–2022)"},
    {"status":"alumni","img":"assets/people/nadira.webp","name":"Nadira Khatoon","role":"Ph.D. Scholar","email":"","linkedin":"","bio":"Investigated ligand binding at the orthosteric site and allosteric modulation in neuronal nAChRs by patch-clamp — quantifying ligand-binding energies, gating energies and communication between allosteric and ligand-binding sites.","past":"Past:\nMSc, University of Lucknow (2017–2019)"},
    {"status":"alumni","img":"assets/people/rachita.webp","name":"Rachita Sharma","role":"MS(R) Scholar","email":"","linkedin":"","bio":"Now pursuing a PhD at the Max Planck Institute of Biophysics, Frankfurt.","past":"Past:\nBTech, GGSIP University"},
    {"status":"alumni","img":"assets/people/poulomi.webp","name":"Poulomi Dey","role":"Post-doctoral Fellow","email":"","linkedin":"","bio":"Now a postdoctoral fellow at the Centre of Molecular Biology and Genetics of Neurodegeneration, Dept. of Psychiatry, Icahn School of Medicine at Mount Sinai.","past":""},
    {"status":"alumni","img":"assets/people/dhawal.webp","name":"Dhawal Kumar Jha","role":"M.Sc. Student","email":"","linkedin":"","bio":"Passionate about understanding the nervous system at multiple scales — from the biophysics of ion channels to the computational logic of neural circuits and the transcriptional landscape of individual cells.","past":"Current: MSc Biological Sciences, IIT Delhi (2025–2026)\nPast:\nBSc Zoology, Hansraj College, University of Delhi (2020–2023)"},
    {"status":"alumni","img":"","name":"Nikita","role":"Student","email":"","linkedin":"","bio":"","past":""}
  ],

  /* PUBLICATIONS — grouped by "year" on the site (newest first). url = link to the paper. */
  "publications": [
    {"year":"2026","title":"Allosteric signal initiation and communication in neuromuscular acetylcholine receptors","authors":"Kampani P, Nayak TK","venue":"bioRxiv (preprint)","url":"https://doi.org/10.64898/2026.08.02.742316"},
    {"year":"2025","title":"TRPML3 regulates neuronal gene expression in an in vitro model of autophagy and may act as a genetic marker of familial neurodegenerative disorders","authors":"Adusumilli S, Mathe MM, Shandilya J, Nayak TK","venue":"bioRxiv (preprint)","url":"https://doi.org/10.1101/2025.06.28.662125"},
    {"year":"2024","title":"Role of surface negative charges in agonist binding to the ‘unliganded’ open state of the neuromuscular acetylcholine receptor","authors":"Khatoon N, Nayak TK","venue":"bioRxiv (preprint)","url":"https://doi.org/10.1101/2024.12.23.630096"},
    {"year":"2024","title":"Mechanism of hydrophobic gating in the acetylcholine receptor channel pore","authors":"Kumari M, Khatoon N, Sharma R, Adusumilli S, Auerbach A, Kashyap HK, Nayak TK","venue":"J. Gen. Physiol. 156(2):e202213189","url":"https://doi.org/10.1085/jgp.202213189"},
    {"year":"2019","title":"Efficiency measures the conversion of agonist binding energy into receptor conformational change","authors":"Nayak TK, Vij R, Bruhova I, Shandilya J, Auerbach A","venue":"J. Gen. Physiol.","url":"https://doi.org/10.1085/jgp.201812215"},
    {"year":"2019","title":"iPSC model of CHRFAM7A effect on α7 nicotinic acetylcholine receptor function in the human context","authors":"Ihnatovych I, Nayak TK, Ouf A, Sule N, Birkaya B, Chaves L, Auerbach A, Szigeti K","venue":"Transl. Psychiatry 9:59","url":"https://doi.org/10.1038/s41398-019-0375-z"},
    {"year":"2017","title":"Cyclic activation of endplate acetylcholine receptors","authors":"Nayak TK, Auerbach A","venue":"PNAS","url":"https://doi.org/10.1073/pnas.1711228114"},
    {"year":"2016","title":"Structural correlates of affinity in fetal versus adult endplate nicotinic receptors","authors":"Nayak TK, Chakrabarty S, Zheng W, Auerbach A","venue":"Nat. Commun.","url":"https://doi.org/10.1038/ncomms11352"},
    {"year":"2016","title":"AP1 transcription factors are required to maintain the peripheral taste system","authors":"Shandilya J, Gao Y, Nayak TK, Roberts S, Medler K","venue":"Cell Death Dis.","url":"https://doi.org/10.1038/cddis.2016.343"},
    {"year":"2014","title":"Functional differences between neurotransmitter binding sites of muscle acetylcholine receptors","authors":"Nayak TK, Bruhova I, Chakrabarty S, Gupta S, Zheng W, Auerbach A","venue":"PNAS","url":"https://doi.org/10.1073/pnas.1414378111"},
    {"year":"2014","title":"Spatial and temporal characteristics of normal and perturbed axonal transport in vivo","authors":"Iacobucci G, Rahman NA, Valtuena AA, Nayak TK, Gunawardena S","venue":"PLoS One","url":"https://doi.org/10.1371/journal.pone.0097237"},
    {"year":"2013","title":"Asymmetric transmitter binding sites of fetal muscle acetylcholine receptors shape their synaptic response","authors":"Nayak TK, Auerbach A","venue":"PNAS","url":"https://doi.org/10.1073/pnas.1308247110"},
    {"year":"2012","title":"The intrinsic energy of the gating isomerization of a neuromuscular acetylcholine receptor channel","authors":"Nayak TK, Purohit PG, Auerbach A","venue":"J. Gen. Physiol.","url":"https://doi.org/10.1085/jgp.201110752"},
    {"year":"2007–2011","title":"Activator-induced dynamic disorder and molecular memory in human two-pore domain hTREK1 K⁺ channel","authors":"Nayak TK, Dana S, Raha S, Sikdar SK","venue":"J. Chem. Biol.","url":"https://doi.org/10.1007/s12154-010-0049-z"},
    {"year":"2007–2011","title":"Inhibition of human two-pore domain K⁺ channel TREK1 by local anesthetic lidocaine: negative cooperativity and half-of-sites saturation kinetics","authors":"Nayak TK, Harinath S, Nama S, Somasundaram K, Sikdar SK","venue":"Mol. Pharmacol.","url":"https://doi.org/10.1124/mol.109.056838"},
    {"year":"2007–2011","title":"Time-dependent molecular memory in single voltage-gated sodium channel","authors":"Nayak TK, Sikdar SK","venue":"J. Membr. Biol.","url":"https://doi.org/10.1007/s00232-007-9059-3"}
  ],

  /* BOOK CHAPTERS & UNDER REVIEW (shown in their own block, no year, no link) */
  "publicationsOther": [
    {"title":"Protein engineering and design in ion channels and receptors (Book chapter)","authors":"Khatoon N, Adusumilli S, Dey P, Sharma R, Kampani P, Shandilya J, Nayak TK (2022)","venue":"Methods Cell Biol. 169:143–168"},
    {"title":"Genomic and transcriptomic applications in neural stem cell therapeutics (Book chapter)","authors":"Adusumilli S, Chauhan M, Mathe MM, Nayak TK, Shandilya J (2024)","venue":"In: Computational Biology for Stem Cell Research, Academic Press, pp. 215–230"}
  ],

  /* LAB UPDATES (homepage) — newest first; the homepage shows the first 4. */
  "news": [
    {"date":"2024","tag":"Publication","text":"Our paper on the mechanism of hydrophobic gating in the acetylcholine receptor pore is published in the Journal of General Physiology."},
    {"date":"2022","tag":"Publication","text":"Book chapter “Protein engineering and design in ion channels and receptors” published in Methods in Cell Biology."}
  ],

  /* RESEARCH THEMES — the seven Research-page cards, in order. Home shows 1, 3 and 7. */
  "research": [
    {"img":"assets/research/ligand-binding.webp","tag":"Energetics","title":"Ligand-Binding Energetics","blurb":"Measuring how much of an agonist’s binding energy is spent opening the channel."},
    {"img":"assets/research/allosteric-communication.webp","tag":"Allostery","title":"Allosteric Communication","blurb":"Tracing how a binding signal travels ~50 Å from the transmitter site to the pore."},
    {"img":"assets/research/allosteric-therapeutics.webp","tag":"Drug design","title":"Allosteric Therapeutics","blurb":"An in silico-to-bench pipeline for new allosteric drug candidates."},
    {"img":"assets/research/neuropathic-pain.webp","tag":"Circuits","title":"Neuropathic Pain","blurb":"Dissecting nicotinic, glutamatergic and TRP channel contributions to chronic pain."},
    {"img":"assets/research/synaptic-maturation.webp","tag":"Development","title":"Synaptic Maturation","blurb":"How synaptic receptors change as synapses mature during development."},
    {"img":"assets/research/allosteric-gpcrs.webp","tag":"Signalling","title":"Allosteric GPCRs","blurb":"Using GIRK channels as a fast electrical reporter of GPCR activation."},
    {"img":"assets/research/intracellular-ion-channels.webp","tag":"Organelles","title":"Intracellular Ion Channels","blurb":"Probing TRPML3 and TPC2 in autophagy and neurodegeneration."}
  ],

  /* COURSES (Teaching page) — in the order shown. img: an image in assets/courses/. */
  "courses": [
    {"code":"SBL100","title":"Introductory Biology for Engineers","level":"Undergraduate core course","img":"assets/courses/SBL100.webp","desc":"A first-year introduction to the molecules, cells and systems of life — from biochemistry and genetics to physiology and evolution — building the vocabulary for quantitative biology."},
    {"code":"SBL723","title":"Principles of Neural Excitability and Communications","level":"Graduate elective","img":"assets/courses/SBL723.webp","desc":"Membrane excitability and the biophysics of ion channels, taught alongside the patch-clamp techniques used to record single-channel and whole-cell currents."},
    {"code":"SBV887","title":"Current Concepts in Computational Biology","level":"Graduate / PhD course","img":"assets/courses/SBV887.webp","desc":"A hands-on survey of the experimental toolkit of modern biophysics — spectroscopy, electrophysiology, microscopy and structural methods — and how to read their data."},
    {"code":"SBV892","title":"Current Concepts in Ion Channels and Receptors","level":"Graduate / PhD course","img":"assets/courses/SBV892.webp","desc":"The physics of biological membranes: lipid bilayers, passive and active transport, electrochemical gradients, and the channel and transporter proteins that gate them."}
  ],

  /* GALLERY — in display order; the first is the big featured one. caption is shown under the photo and used as alt text. */
  "gallery": [
    {"img":"assets/gallery/group-photo-steps.webp","caption":"The group on the front steps"},
    {"img":"assets/gallery/group-photo-lab-room.webp","caption":"The group in the lab meeting room"},
    {"img":"assets/gallery/group-iit-delhi-main-building.webp","caption":"The group outside the IIT Delhi main building"},
    {"img":"assets/gallery/cafe-sandoz-group.webp","caption":"Lab members outside Cafe Sandoz"},
    {"img":"assets/gallery/certificate-nadira-khatoon.webp","caption":"A certificate for Dr. Nadira Khatoon"},
    {"img":"assets/gallery/cake-cutting-lab-room.webp","caption":"Cutting a cake in the lab meeting room"},
    {"img":"assets/gallery/flipr-penta-installation.webp","caption":"With the FLIPR Penta high-throughput screening system"},
    {"img":"assets/gallery/patch-clamp-rig.webp","caption":"A patch-clamp rig inside its Faraday cage"},
    {"img":"assets/gallery/selfie-iit-delhi-main-building.webp","caption":"A group selfie outside the IIT Delhi main building"},
    {"img":"assets/gallery/group-lunch-selfie.webp","caption":"Lab members at a group lunch"},
    {"img":"assets/gallery/cafe-sandoz-gift.webp","caption":"Handing over a farewell gift outside Cafe Sandoz"},
    {"img":"assets/gallery/beside-patch-clamp-rig.webp","caption":"Beside a patch-clamp rig"},
    {"img":"assets/gallery/group-dinner.webp","caption":"Lab members at a group dinner"},
    {"img":"assets/gallery/cafe-sandoz-selfie.webp","caption":"A group selfie outside Cafe Sandoz"},
    {"img":"assets/gallery/certificate-presentation.webp","caption":"Receiving a certificate at an event"},
    {"img":"assets/gallery/walk-on-campus.webp","caption":"A walk across the IIT Delhi campus"},
    {"img":"assets/gallery/group-outing.webp","caption":"Lab members on a group outing"},
    {"img":"assets/gallery/birthday-cake.webp","caption":"A birthday cake celebration"},
    {"img":"assets/gallery/portrait-patch-clamp.webp","caption":"Portrait beside the patch-clamp microscope"}
  ],

  /* OPEN POSITIONS (Join page) — status "Closed" greys the card out. */
  "positions": [
    {"title":"PhD Students","status":"Open","desc":"Admission through the IIT Delhi PhD cycle. Strong interest in biophysics, physiology or quantitative biology required."},
    {"title":"Postdoctoral Fellows","status":"Rolling","desc":"NPDF, institute and external fellowships welcome. Experience in electrophysiology or simulation is a plus."},
    {"title":"Project Associates / RAs","status":"Enquire","desc":"Hands-on roles in electrophysiology, molecular biology and protein biochemistry."},
    {"title":"Masters & Interns","status":"Enquire","desc":"Short research projects, thesis work and summer rotations on the patch-clamp rig."}
  ]

};
