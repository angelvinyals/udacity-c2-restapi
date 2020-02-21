import { Router, Request, Response } from 'express';
import { FeedItem } from '../models/FeedItem';
import { requireAuth } from '../../users/routes/auth.router';
import * as AWS from '../../../../aws';

const router: Router = Router();

// Get all feed items
router.get('/', async (req: Request, res: Response) => {
    const items = await FeedItem.findAndCountAll({order: [['id', 'DESC']]});
    items.rows.map((item) => {
            if(item.url) {
                item.url = AWS.getGetSignedUrl(item.url);
            }
    });
    res.send(items);
});

//@TODO
//Add an endpoint to GET a specific resource by Primary Key
router.get('/:id', async (req: Request, res: Response) => {
    let { id } = req.params;
    console.log (`id: ${id}`)    
    if(id) {
       const item = await FeedItem.findByPk(id);
       console.log (`item: ${item}`)        
       if(item) {
           return res.status(200)
           .send(item);           
       }
       res.status(400)
           .send(`there is no item found `);                  
    }   
    return res.status(400)
            .send(`sorry ,id is required`);  
});


// update a specific resource
router.patch('/:id', 
    requireAuth, 
    async (req: Request, res: Response, next) => {
        //@TODO try it yourself
        let { id } = req.params;
        console.log (`patch el id es: ${id}`) 
        
        if (id) {
            const {caption,url} = req.body;
            console.log (`caption: ${caption}, url: ${url}`)

            // check Caption is valid
            if (!caption) {
                return res.status(400).send({ message: 'Caption is required or malformed' });
            }

            // check Filename is valid
            if (!url) {
                return res.status(400).send({ message: 'File url is required' });
            }
          
            const itemToUpdate = {
                caption,
                url
            }
            console.log(`el nou item es: ${JSON.stringify(itemToUpdate)}`) 
            
            try {
                // Get the item by Primary Key
                const item = await FeedItem.findByPk(id);
                // Update the item with the new data
                const updated = await item.update(itemToUpdate);
                return res.send(updated);
               } catch (e) {
                return next(new Error(e));
               }     
        }
        
        return res.status(500).send("id is not as url param. put id please. ")
});


// Get a signed url to put a new item in the bucket
router.get('/signed-url/:fileName', 
    requireAuth, 
    async (req: Request, res: Response) => {
    let { fileName } = req.params;
    const url = AWS.getPutSignedUrl(fileName);
    res.status(201).send({url: url});
});

// Post meta data and the filename after a file is uploaded 
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post('/', 
    requireAuth, 
    async (req: Request, res: Response) => {
    const caption = req.body.caption;
    const fileName = req.body.url;

    // check Caption is valid
    if (!caption) {
        return res.status(400).send({ message: 'Caption is required or malformed' });
    }

    // check Filename is valid
    if (!fileName) {
        return res.status(400).send({ message: 'File url is required' });
    }

    const item = await new FeedItem({
            caption: caption,
            url: fileName
    });

    const saved_item = await item.save();

    saved_item.url = AWS.getGetSignedUrl(saved_item.url);
    res.status(201).send(saved_item);
});

export const FeedRouter: Router = router;